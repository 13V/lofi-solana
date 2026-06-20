//! # lofi_rewards
//!
//! On-chain rewards rails for **lofi-solana**: users make a lofi song, launch
//! it as a token via pump.fun, and earn from trading fees weighted by VERIFIED
//! listens.
//!
//! This program does NOT mint the song token (pump.fun does that off-chain).
//! It provides:
//!   * a per-song SOL vault that accumulates pump.fun creator-fee revenue,
//!   * an oracle-attested, cumulative Merkle distributor that splits that SOL
//!     to listeners/creators according to off-chain, listen-weighted accounting.
//!
//! High-level flow:
//!   1. `register_song` — creator registers a launched mint; creates `Song` +
//!      `SongVault`.
//!   2. SOL flows into `SongVault` (pump.fun creator fees and/or `fund_vault`).
//!   3. Off-chain: the oracle tallies verified listens for an epoch, builds a
//!      *cumulative* Merkle tree of `(recipient -> total_owed_so_far)`, and
//!      Ed25519-signs `(song_mint, epoch, root, total_amount)`.
//!   4. `set_epoch_root` — anyone submits a tx containing the oracle's Ed25519
//!      precompile instruction immediately followed by this instruction; the
//!      program verifies the attestation, moves `total_amount` lamports from
//!      the vault into the `Distributor`, and stores the new root/epoch.
//!   5. `claim` — each recipient submits a Merkle proof and gets paid
//!      `attested_total - already_claimed`.
//!
//! NOT AUDITED. This is a skeleton with `// TODO(audit)` markers where logic is
//! intentionally stubbed or needs devnet verification.

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::solana_program::sysvar::instructions::ID as INSTRUCTIONS_SYSVAR_ID;

pub mod ed25519;
pub mod errors;
pub mod merkle;
pub mod state;

use errors::LofiError;
use state::*;

// TODO(audit): replace with the real deployed program id from
// `anchor keys list` / the generated keypair before mainnet. This is a
// well-known placeholder used across Anchor examples.
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// PDA seed prefixes — kept here so on-chain code and the SDK share one source.
pub const CONFIG_SEED: &[u8] = b"config";
pub const SONG_SEED: &[u8] = b"song";
pub const VAULT_SEED: &[u8] = b"vault";
pub const DIST_SEED: &[u8] = b"dist";
pub const CLAIM_SEED: &[u8] = b"claim";

#[program]
pub mod lofi_rewards {
    use super::*;

    /// Initialize the singleton global config. The signer becomes `admin`.
    pub fn init_config(ctx: Context<InitConfig>, oracle_authority: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.oracle_authority = oracle_authority;
        config.bump = ctx.bumps.config;

        msg!(
            "lofi_rewards config initialized: admin={}, oracle={}",
            config.admin,
            config.oracle_authority
        );
        Ok(())
    }

    /// Register a launched song mint for rewards. Creates the `Song` record and
    /// the system-owned `SongVault` PDA that custodies SOL.
    ///
    /// The song token is minted via pump.fun OFF-CHAIN; this only wires up
    /// reward accounting for `song_mint`.
    ///
    /// OPEN QUESTION — how pump.fun creator fees reach `SongVault`:
    ///   * v1 (safe, default): a platform-controlled fee-share wallet receives
    ///     pump.fun creator fees and forwards SOL here via `fund_vault`.
    ///   * v2 (UNVERIFIED): set the pump.fun `coin_creator` directly to this
    ///     `SongVault` PDA so creator fees accrue here automatically. Whether a
    ///     program-derived address can be set as `coin_creator` and later have
    ///     fees claimed to it MUST be tested on devnet against the live
    ///     pump.fun program before relying on it.
    pub fn register_song(ctx: Context<RegisterSong>) -> Result<()> {
        let clock = Clock::get()?;
        let song = &mut ctx.accounts.song;
        song.song_mint = ctx.accounts.song_mint.key();
        song.creator = ctx.accounts.creator.key();
        song.created_at = clock.unix_timestamp;
        song.total_distributed = 0;
        song.bump = ctx.bumps.song;

        // Initialize the distributor for this song with an empty root.
        let dist = &mut ctx.accounts.distributor;
        dist.song_mint = ctx.accounts.song_mint.key();
        dist.root = [0u8; 32];
        dist.epoch = 0;
        dist.total_committed = 0;
        dist.total_claimed = 0;
        dist.bump = ctx.bumps.distributor;

        // `SongVault` is a System-owned PDA; it is not allocated here. It is
        // funded lazily on the first `fund_vault` / pump.fun fee deposit and can
        // sign System transfers out via its seeds (see `set_epoch_root`).
        msg!(
            "registered song mint={} creator={} vault={}",
            song.song_mint,
            song.creator,
            ctx.accounts.song_vault.key()
        );
        Ok(())
    }

    /// Permissionless deposit of SOL into a song's vault.
    ///
    /// Anyone may top up the vault (e.g. the platform fee-share wallet
    /// forwarding pump.fun creator-fee revenue). Uses a System Program transfer
    /// from `payer` -> `song_vault`.
    pub fn fund_vault(ctx: Context<FundVault>, amount: u64) -> Result<()> {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.song_vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, amount)?;

        msg!(
            "funded vault for mint={} with {} lamports (payer={})",
            ctx.accounts.song.song_mint,
            amount,
            ctx.accounts.payer.key()
        );
        Ok(())
    }

    /// Commit a new cumulative Merkle root for an epoch, gated by an Ed25519
    /// oracle attestation, and move `total_amount` lamports from the vault into
    /// the distributor to back the new claims.
    ///
    /// REQUIREMENT: the transaction MUST contain an Ed25519 precompile
    /// instruction *immediately before* this one, signed by
    /// `config.oracle_authority` over the bytes
    /// `oracle_message(song_mint, epoch, root, total_amount)`. See `ed25519.rs`.
    pub fn set_epoch_root(
        ctx: Context<SetEpochRoot>,
        root: [u8; 32],
        total_amount: u64,
        epoch: u64,
    ) -> Result<()> {
        let song_mint = ctx.accounts.song.song_mint;

        // 1) Verify the oracle attestation over EXACTLY this (root, epoch, amount).
        let expected_msg = ed25519::oracle_message(&song_mint, epoch, &root, total_amount);
        ed25519::verify_ed25519_oracle(
            &ctx.accounts.instructions_sysvar.to_account_info(),
            &ctx.accounts.config.oracle_authority,
            &expected_msg,
        )?;

        // 2) Enforce monotonically increasing epochs. The distributor starts at
        //    epoch 0 with an empty root; the first real root should be epoch 1+.
        require!(
            epoch > ctx.accounts.distributor.epoch,
            LofiError::Unauthorized
        );

        // 3) Move `total_amount` lamports from the system-owned vault into the
        //    distributor PDA. The vault is a System Program account whose
        //    address is derived from our seeds, so we sign the transfer CPI with
        //    those seeds.
        if total_amount > 0 {
            let song_mint_key = song_mint;
            let vault_bump = ctx.bumps.song_vault;
            let signer_seeds: &[&[&[u8]]] =
                &[&[VAULT_SEED, song_mint_key.as_ref(), &[vault_bump]]];

            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.song_vault.to_account_info(),
                    to: ctx.accounts.distributor.to_account_info(),
                },
                signer_seeds,
            );
            // NOTE: A System-owned PDA can sign a System Program transfer via
            // invoke_signed as long as it carries no data. `SongVault` is exactly
            // that. The destination `distributor` is program-owned; receiving
            // lamports into it via System transfer is fine.
            // TODO(audit): confirm a System transfer CPI *out of* a PDA with our
            // seeds succeeds on devnet; if the runtime rejects it (because the
            // account, though System-owned, is "claimed" by our program as a
            // signer), fall back to direct lamport arithmetic:
            //   **vault.try_borrow_mut_lamports()? -= total_amount;
            //   **distributor.try_borrow_mut_lamports()? += total_amount;
            // which is always valid since the program may debit accounts it can
            // sign for and credit any account.
            system_program::transfer(cpi_ctx, total_amount)?;
        }

        // 4) Update distributor state.
        let dist = &mut ctx.accounts.distributor;
        dist.root = root;
        dist.epoch = epoch;
        dist.total_committed = dist
            .total_committed
            .checked_add(total_amount)
            .ok_or(LofiError::MathOverflow)?;

        msg!(
            "epoch root set: mint={} epoch={} total_amount={} new_total_committed={}",
            song_mint,
            epoch,
            total_amount,
            dist.total_committed
        );
        Ok(())
    }

    /// Claim against the current cumulative root.
    ///
    /// `amount` is the claimant's CUMULATIVE entitlement encoded in the current
    /// tree (total owed so far, not this-epoch delta). The payout is
    /// `amount - claim_status.claimed`. The leaf is recomputed from the signer's
    /// own pubkey + `amount`, so a claimant can only ever claim their own leaf.
    pub fn claim(ctx: Context<Claim>, amount: u64, proof: Vec<[u8; 32]>) -> Result<()> {
        let claimant = ctx.accounts.claimant.key();

        // 1) Recompute leaf and verify the proof against the committed root.
        let leaf = merkle::hash_leaf(&claimant, amount);
        require!(
            merkle::verify_proof(&proof, &ctx.accounts.distributor.root, leaf),
            LofiError::InvalidProof
        );

        // 2) Compute the unpaid delta. Cumulative model => pay the difference.
        let already = ctx.accounts.claim_status.claimed;
        let payout = amount.checked_sub(already).ok_or(LofiError::NothingToClaim)?;
        require!(payout > 0, LofiError::NothingToClaim);

        // 3) Pay out from the distributor PDA. The distributor is program-owned
        //    and carries data, so it CANNOT sign a System transfer; instead we
        //    move lamports directly (allowed because we own the account). We
        //    must preserve rent-exemption on the distributor.
        let dist_ai = ctx.accounts.distributor.to_account_info();
        let claimant_ai = ctx.accounts.claimant.to_account_info();

        let rent = Rent::get()?;
        let min_balance = rent.minimum_balance(dist_ai.data_len());
        let dist_balance = dist_ai.lamports();
        require!(
            dist_balance
                .checked_sub(payout)
                .ok_or(LofiError::MathOverflow)?
                >= min_balance,
            LofiError::MathOverflow
        );

        **dist_ai.try_borrow_mut_lamports()? = dist_balance
            .checked_sub(payout)
            .ok_or(LofiError::MathOverflow)?;
        **claimant_ai.try_borrow_mut_lamports()? = claimant_ai
            .lamports()
            .checked_add(payout)
            .ok_or(LofiError::MathOverflow)?;

        // 4) Bookkeeping.
        let claim_status = &mut ctx.accounts.claim_status;
        claim_status.claimed = amount;
        if claim_status.bump == 0 {
            claim_status.bump = ctx.bumps.claim_status;
        }

        let dist = &mut ctx.accounts.distributor;
        dist.total_claimed = dist
            .total_claimed
            .checked_add(payout)
            .ok_or(LofiError::MathOverflow)?;

        let song = &mut ctx.accounts.song;
        song.total_distributed = song
            .total_distributed
            .checked_add(payout)
            .ok_or(LofiError::MathOverflow)?;

        msg!(
            "claim: mint={} claimant={} cumulative={} paid_now={}",
            song.song_mint,
            claimant,
            amount,
            payout
        );
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Account contexts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterSong<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The pump.fun / SPL mint of the launched song token. Unchecked because we
    /// only use its key as a seed; we do not read mint data here.
    /// TODO(audit): optionally tighten to `Account<'info, Mint>` (anchor-spl) to
    /// guarantee `song_mint` is a real initialized mint.
    /// CHECK: used only as a PDA seed / stored pubkey.
    pub song_mint: UncheckedAccount<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + Song::INIT_SPACE,
        seeds = [SONG_SEED, song_mint.key().as_ref()],
        bump
    )]
    pub song: Account<'info, Song>,

    #[account(
        init,
        payer = creator,
        space = 8 + Distributor::INIT_SPACE,
        seeds = [DIST_SEED, song_mint.key().as_ref()],
        bump
    )]
    pub distributor: Account<'info, Distributor>,

    /// System-owned vault PDA that custodies SOL for this song.
    ///
    /// We deliberately do NOT `init` it: a System-owned PDA with no data needs
    /// no allocation to receive SOL, and `init` would assign it to *this*
    /// program (breaking the "plain wallet" behavior we want — namely the
    /// ability to sign System transfers out via its seeds). Anchor's
    /// `SystemAccount` type already asserts the account is System-owned; the
    /// `seeds`/`bump` constraint pins it to the canonical address. The first
    /// `fund_vault` (or pump.fun fee deposit) lazily funds it.
    #[account(
        mut,
        seeds = [VAULT_SEED, song_mint.key().as_ref()],
        bump
    )]
    pub song_vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundVault<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [SONG_SEED, song.song_mint.as_ref()],
        bump = song.bump,
    )]
    pub song: Account<'info, Song>,

    #[account(
        mut,
        seeds = [VAULT_SEED, song.song_mint.as_ref()],
        bump,
    )]
    pub song_vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetEpochRoot<'info> {
    /// Anyone may submit the attested root; authorization comes from the
    /// Ed25519 oracle signature, not from this signer.
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        seeds = [SONG_SEED, song.song_mint.as_ref()],
        bump = song.bump,
    )]
    pub song: Account<'info, Song>,

    #[account(
        mut,
        seeds = [VAULT_SEED, song.song_mint.as_ref()],
        bump,
    )]
    pub song_vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [DIST_SEED, song.song_mint.as_ref()],
        bump = distributor.bump,
        has_one = song_mint,
    )]
    pub distributor: Account<'info, Distributor>,

    /// Bound by `has_one = song_mint` on the distributor.
    /// CHECK: key-only; matched against `distributor.song_mint`.
    pub song_mint: UncheckedAccount<'info>,

    /// The Instructions sysvar, used to introspect the preceding Ed25519 ix.
    /// CHECK: address is pinned to the canonical Instructions sysvar id.
    #[account(address = INSTRUCTIONS_SYSVAR_ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64, proof: Vec<[u8; 32]>)]
pub struct Claim<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,

    #[account(
        mut,
        seeds = [SONG_SEED, song.song_mint.as_ref()],
        bump = song.bump,
    )]
    pub song: Account<'info, Song>,

    #[account(
        mut,
        seeds = [DIST_SEED, song.song_mint.as_ref()],
        bump = distributor.bump,
        has_one = song_mint,
    )]
    pub distributor: Account<'info, Distributor>,

    /// CHECK: key-only; matched against `distributor.song_mint` via `has_one`.
    pub song_mint: UncheckedAccount<'info>,

    /// Per-(song, claimant) cumulative claim record. `init_if_needed` so the
    /// first claim creates it and later claims reuse it.
    /// TODO(audit): `init_if_needed` is convenient but must be paired with the
    /// re-init guard below (we never reset `claimed`) — review carefully.
    #[account(
        init_if_needed,
        payer = claimant,
        space = 8 + ClaimStatus::INIT_SPACE,
        seeds = [CLAIM_SEED, song.song_mint.as_ref(), claimant.key().as_ref()],
        bump,
    )]
    pub claim_status: Account<'info, ClaimStatus>,

    pub system_program: Program<'info, System>,
}
