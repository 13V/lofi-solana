use anchor_lang::prelude::*;

/// Error codes for the `lofi_rewards` program.
///
/// Keep these stable: the off-chain SDK and tests match on the numeric
/// discriminants Anchor derives from declaration order.
#[error_code]
pub enum LofiError {
    #[msg("Signer is not authorized to perform this action.")]
    Unauthorized,

    #[msg("The Ed25519 oracle attestation is missing, malformed, or does not match the expected message.")]
    InvalidOracleSignature,

    #[msg("The supplied Merkle proof does not verify against the distributor root.")]
    InvalidProof,

    #[msg("Nothing left to claim: cumulative claimed amount is already >= the attested amount.")]
    NothingToClaim,

    #[msg("Expected an Ed25519 precompile instruction immediately preceding this instruction.")]
    MissingEd25519Instruction,

    #[msg("Arithmetic overflow/underflow.")]
    MathOverflow,
}
