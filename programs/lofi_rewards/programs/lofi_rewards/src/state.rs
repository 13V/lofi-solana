use anchor_lang::prelude::*;

/// Global program configuration. One per deployment.
///
/// PDA seeds: `["config"]`
#[account]
#[derive(InitSpace)]
pub struct Config {
    /// Admin authority allowed to (re)configure the program.
    pub admin: Pubkey,
    /// The off-chain signer (Ed25519 keypair) that attests listen-weighted
    /// reward roots. Its public key is checked against the pubkey embedded in
    /// the Ed25519 precompile instruction during `set_epoch_root`.
    pub oracle_authority: Pubkey,
    /// PDA bump.
    pub bump: u8,
}

/// Per-song registration record. Created when a creator registers a song mint
/// for rewards. The song token itself is minted via pump.fun OFF-CHAIN; this
/// account only tracks reward accounting for that mint.
///
/// PDA seeds: `["song", song_mint]`
#[account]
#[derive(InitSpace)]
pub struct Song {
    /// The SPL/pump.fun mint of the launched song token.
    pub song_mint: Pubkey,
    /// The creator who registered the song (signer at registration time).
    pub creator: Pubkey,
    /// Unix timestamp of registration.
    pub created_at: i64,
    /// Lifetime lamports distributed to claimants across all epochs.
    pub total_distributed: u64,
    /// PDA bump.
    pub bump: u8,
}

/// Cumulative Merkle distributor for a single song.
///
/// "Cumulative" means each epoch's leaves encode the *total* amount a claimant
/// is entitled to so far (not just this epoch's delta). A claim pays out
/// `attested_amount - already_claimed`, so a claimant can safely skip epochs
/// and a single claim settles everything owed up to the current root.
///
/// PDA seeds: `["dist", song_mint]`
#[account]
#[derive(InitSpace)]
pub struct Distributor {
    /// Mint this distributor settles rewards for.
    pub song_mint: Pubkey,
    /// Current cumulative Merkle root (keccak256, sorted-pair). See `merkle.rs`.
    pub root: [u8; 32],
    /// Monotonically increasing epoch counter for the committed root.
    pub epoch: u64,
    /// Total lamports committed into this distributor across all epochs
    /// (i.e. moved from the vault into this PDA to back claims).
    pub total_committed: u64,
    /// Total lamports actually claimed by recipients so far.
    pub total_claimed: u64,
    /// PDA bump.
    pub bump: u8,
}

/// Per-(song, claimant) cumulative claim bookkeeping.
///
/// PDA seeds: `["claim", song_mint, claimant]`
#[account]
#[derive(InitSpace)]
pub struct ClaimStatus {
    /// Cumulative lamports this claimant has already withdrawn for this song.
    pub claimed: u64,
    /// PDA bump.
    pub bump: u8,
}

// NOTE: `SongVault` is intentionally NOT defined here. It is a *system-owned*
// PDA (seeds `["vault", song_mint]`) that merely custodies SOL. It has no
// program-defined data layout; we reference it as a raw `SystemAccount`/
// `UncheckedAccount` and move lamports in/out via the System Program (for
// deposits) and direct lamport arithmetic on a `mut` account (for the
// vault -> distributor transfer in `set_epoch_root`, since a PDA the System
// Program does not "own" as a wallet cannot sign a CPI transfer once it
// carries our seeds — see comments in lib.rs).
