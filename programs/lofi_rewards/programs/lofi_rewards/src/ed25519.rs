//! Ed25519 oracle attestation via the Instructions sysvar.
//!
//! `set_epoch_root` must only run if the off-chain oracle actually signed the
//! exact root being committed. We enforce this by requiring the *same
//! transaction* to carry an Ed25519 precompile instruction immediately BEFORE
//! our instruction. The precompile (run by the validator) cryptographically
//! verifies the signature; our job here is only to *introspect* that
//! instruction and assert it bound the right pubkey + message.
//!
//! Trust model: the Ed25519 native program guarantees that, if the transaction
//! landed, every (pubkey, message, signature) triple it declares verified. So
//! if we confirm the prior instruction is the Ed25519 program AND its embedded
//! pubkey == `config.oracle_authority` AND its embedded message == our expected
//! bytes, then the oracle signed our message. See:
//! https://solana.com/docs/core/programs/precompiles
//!
//! Ed25519 instruction data layout (single signature, as produced by
//! `Ed25519Program.createInstructionWithPrivateKey` in @solana/web3.js):
//!
//!   offset 0:  num_signatures            u8   (== 1)
//!   offset 1:  padding                   u8   (== 0)
//!   offset 2:  Ed25519SignatureOffsets   14 bytes, 7x u16 little-endian:
//!                  signature_offset             u16
//!                  signature_instruction_index  u16
//!                  public_key_offset            u16
//!                  public_key_instruction_index u16
//!                  message_data_offset          u16
//!                  message_data_size            u16
//!                  message_instruction_index    u16
//!   offset 16: <signature(64)> <public_key(32)> <message(..)>
//!
//! We do NOT hardcode the data offsets; we read them from the offsets header
//! so the check stays correct even if the message length changes. We DO assert
//! that all `*_instruction_index` fields point at "this same instruction"
//! (0xFFFF, the sentinel the web3.js builder uses for self-referential data),
//! so an attacker cannot point the offsets at some other instruction's bytes.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::ed25519_program;
use anchor_lang::solana_program::sysvar::instructions::{
    load_current_index_checked, load_instruction_at_checked,
};

use crate::errors::LofiError;

/// Header geometry constants for the Ed25519 precompile instruction data.
const NUM_SIGNATURES_OFFSET: usize = 0;
const PADDING_OFFSET: usize = 1;
const SIGNATURE_OFFSETS_START: usize = 2;
/// Size of one `Ed25519SignatureOffsets` (7 * u16).
const SIGNATURE_OFFSETS_SERIALIZED_SIZE: usize = 14;
/// Where the signature/pubkey/message blob begins for a single-sig instruction.
const DATA_START: usize = SIGNATURE_OFFSETS_START + SIGNATURE_OFFSETS_SERIALIZED_SIZE; // 16

const SIGNATURE_LEN: usize = 64;
const PUBKEY_LEN: usize = 32;

/// Sentinel `instruction_index` meaning "data lives in this same instruction",
/// as emitted by `Ed25519Program.createInstructionWithPrivateKey`.
const SELF_INSTRUCTION_INDEX: u16 = u16::MAX; // 0xFFFF

/// Read a little-endian u16 from `data[at..at+2]`.
#[inline]
fn read_u16_le(data: &[u8], at: usize) -> Result<u16> {
    let bytes: [u8; 2] = data
        .get(at..at + 2)
        .ok_or(LofiError::InvalidOracleSignature)?
        .try_into()
        .map_err(|_| LofiError::InvalidOracleSignature)?;
    Ok(u16::from_le_bytes(bytes))
}

/// Verify that the instruction immediately preceding the current one is an
/// Ed25519 precompile instruction that signed `expected_message` with
/// `expected_signer`.
///
/// `instructions_sysvar` must be the account at
/// `anchor_lang::solana_program::sysvar::instructions::ID`
/// (`Sysvar1nstructions1111111111111111111111111`).
pub fn verify_ed25519_oracle(
    instructions_sysvar: &AccountInfo,
    expected_signer: &Pubkey,
    expected_message: &[u8],
) -> Result<()> {
    // Index of THIS instruction within the transaction.
    let current_index = load_current_index_checked(instructions_sysvar)?;
    require!(current_index > 0, LofiError::MissingEd25519Instruction);

    // The Ed25519 precompile must sit immediately before us. Requiring an
    // *adjacent* prior instruction (rather than "somewhere earlier") keeps the
    // attestation tightly coupled to this call and is easy to reason about.
    let prev_index = current_index
        .checked_sub(1)
        .ok_or(LofiError::MissingEd25519Instruction)?;
    let prev_ix = load_instruction_at_checked(prev_index as usize, instructions_sysvar)?;

    // 1) It must actually be the Ed25519 native program.
    require_keys_eq!(
        prev_ix.program_id,
        ed25519_program::ID,
        LofiError::MissingEd25519Instruction
    );

    let data = prev_ix.data.as_slice();

    // 2) Basic header sanity: exactly one signature, zero padding.
    require!(
        data.len() >= DATA_START,
        LofiError::InvalidOracleSignature
    );
    require!(
        data[NUM_SIGNATURES_OFFSET] == 1,
        LofiError::InvalidOracleSignature
    );
    require!(data[PADDING_OFFSET] == 0, LofiError::InvalidOracleSignature);

    // 3) Parse the offsets header.
    let signature_offset = read_u16_le(data, SIGNATURE_OFFSETS_START)? as usize;
    let signature_instruction_index = read_u16_le(data, SIGNATURE_OFFSETS_START + 2)?;
    let public_key_offset = read_u16_le(data, SIGNATURE_OFFSETS_START + 4)? as usize;
    let public_key_instruction_index = read_u16_le(data, SIGNATURE_OFFSETS_START + 6)?;
    let message_data_offset = read_u16_le(data, SIGNATURE_OFFSETS_START + 8)? as usize;
    let message_data_size = read_u16_le(data, SIGNATURE_OFFSETS_START + 10)? as usize;
    let message_instruction_index = read_u16_le(data, SIGNATURE_OFFSETS_START + 12)?;

    // 4) All data must be self-contained in this instruction. If any index
    //    pointed elsewhere, the precompile would have verified a signature over
    //    bytes we are NOT inspecting here -> reject.
    require!(
        signature_instruction_index == SELF_INSTRUCTION_INDEX
            && public_key_instruction_index == SELF_INSTRUCTION_INDEX
            && message_instruction_index == SELF_INSTRUCTION_INDEX,
        LofiError::InvalidOracleSignature
    );

    // 5) Defense-in-depth: assert the canonical single-sig packing so the
    //    offsets cannot be reshuffled to make a different blob look valid.
    require!(
        signature_offset == DATA_START,
        LofiError::InvalidOracleSignature
    );
    require!(
        public_key_offset == DATA_START + SIGNATURE_LEN,
        LofiError::InvalidOracleSignature
    );
    require!(
        message_data_offset == DATA_START + SIGNATURE_LEN + PUBKEY_LEN,
        LofiError::InvalidOracleSignature
    );

    // 6) Extract the embedded public key and message and compare.
    let pubkey_bytes = data
        .get(public_key_offset..public_key_offset + PUBKEY_LEN)
        .ok_or(LofiError::InvalidOracleSignature)?;
    require!(
        pubkey_bytes == expected_signer.as_ref(),
        LofiError::InvalidOracleSignature
    );

    let message_bytes = data
        .get(message_data_offset..message_data_offset + message_data_size)
        .ok_or(LofiError::InvalidOracleSignature)?;
    require!(
        message_bytes == expected_message,
        LofiError::InvalidOracleSignature
    );

    // The validator already verified signature-over-(pubkey,message); having
    // matched both, the oracle definitively signed `expected_message`.
    //
    // TODO(audit): consider also asserting `signature_offset` region length and
    // that there are no trailing/extra signatures beyond the single declared
    // one. Confirm web3.js builder output byte-for-byte on devnet.
    Ok(())
}

/// Canonical serialization of the oracle-signed message.
///
/// The oracle signs `(song_mint, epoch, root, total_amount)`. We pin an
/// explicit, fixed-width byte layout (NOT borsh struct framing) so the TS SDK
/// can reproduce it trivially:
///
///   song_mint(32) || epoch_u64_le(8) || root(32) || total_amount_u64_le(8)
///
/// = 80 bytes total.
///
/// TODO(audit): if you prefer borsh, swap both sides to borsh and add a domain
/// separator / version byte to prevent cross-protocol signature reuse.
pub fn oracle_message(
    song_mint: &Pubkey,
    epoch: u64,
    root: &[u8; 32],
    total_amount: u64,
) -> [u8; 80] {
    let mut msg = [0u8; 80];
    msg[0..32].copy_from_slice(song_mint.as_ref());
    msg[32..40].copy_from_slice(&epoch.to_le_bytes());
    msg[40..72].copy_from_slice(root);
    msg[72..80].copy_from_slice(&total_amount.to_le_bytes());
    msg
}
