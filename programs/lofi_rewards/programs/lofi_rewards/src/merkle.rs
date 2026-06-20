//! Cumulative Merkle verification.
//!
//! THIS SPEC MUST MATCH THE TYPESCRIPT SDK EXACTLY. If you change anything
//! here, change the SDK leaf/node hashing in lockstep or every proof will
//! fail to verify.
//!
//! Hash function: keccak256 (`anchor_lang::solana_program::keccak`).
//!
//! Leaf  = keccak256( 0x00 || claimant_pubkey(32) || amount_u64_le(8) )
//! Node  = keccak256( 0x01 || min(a, b)(32) || max(a, b)(32) )   // sorted pair
//!
//! The 0x00 / 0x01 domain-separation prefixes prevent second-preimage attacks
//! where an internal node could be presented as a leaf (OpenZeppelin's
//! `MerkleProof` uses the same sorted-pair construction; we add explicit
//! leaf/node tags for clarity and safety).
//!
//! Verification folds the proof bottom-up: start from the leaf, and for each
//! sibling hash combine with sorted-pair `hash_node`, then compare the final
//! computed hash against the committed root.

use anchor_lang::solana_program::keccak;
use anchor_lang::solana_program::pubkey::Pubkey;

/// Domain-separation tag for leaf hashing.
pub const LEAF_PREFIX: u8 = 0x00;
/// Domain-separation tag for internal-node hashing.
pub const NODE_PREFIX: u8 = 0x01;

/// Compute the leaf hash for `(claimant, amount)`.
///
/// `amount` is encoded as little-endian u64 to match the TS SDK
/// (`new BN(amount).toArrayLike(Buffer, "le", 8)`).
pub fn hash_leaf(claimant: &Pubkey, amount: u64) -> [u8; 32] {
    let mut buf = [0u8; 1 + 32 + 8];
    buf[0] = LEAF_PREFIX;
    buf[1..33].copy_from_slice(claimant.as_ref());
    buf[33..41].copy_from_slice(&amount.to_le_bytes());
    keccak::hash(&buf).to_bytes()
}

/// Combine two child hashes into a parent using sorted-pair ordering.
///
/// Sorting makes the proof side-agnostic (the verifier does not need to know
/// whether the sibling is the left or right child), matching OpenZeppelin's
/// `MerkleProof.processProof`.
pub fn hash_node(a: &[u8; 32], b: &[u8; 32]) -> [u8; 32] {
    let (lo, hi) = if a <= b { (a, b) } else { (b, a) };
    let mut buf = [0u8; 1 + 32 + 32];
    buf[0] = NODE_PREFIX;
    buf[1..33].copy_from_slice(lo);
    buf[33..65].copy_from_slice(hi);
    keccak::hash(&buf).to_bytes()
}

/// Fold a Merkle `proof` starting from `leaf` and return whether the result
/// equals `root`.
///
/// `proof` is the ordered list of sibling hashes from the leaf's level up to
/// (but not including) the root.
pub fn verify_proof(proof: &[[u8; 32]], root: &[u8; 32], leaf: [u8; 32]) -> bool {
    let mut computed = leaf;
    for sibling in proof.iter() {
        computed = hash_node(&computed, sibling);
    }
    &computed == root
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pk(byte: u8) -> Pubkey {
        Pubkey::new_from_array([byte; 32])
    }

    #[test]
    fn single_leaf_tree_root_is_the_leaf() {
        // A one-leaf tree: root == leaf, empty proof verifies.
        let leaf = hash_leaf(&pk(1), 1_000);
        assert!(verify_proof(&[], &leaf, leaf));
    }

    #[test]
    fn two_leaf_tree_verifies_both_sides() {
        let a = hash_leaf(&pk(1), 1_000);
        let b = hash_leaf(&pk(2), 2_000);
        let root = hash_node(&a, &b);
        // Proof for `a` is `[b]`; proof for `b` is `[a]`. Sorted-pair => both work.
        assert!(verify_proof(&[b], &root, a));
        assert!(verify_proof(&[a], &root, b));
    }

    #[test]
    fn wrong_proof_fails() {
        let a = hash_leaf(&pk(1), 1_000);
        let b = hash_leaf(&pk(2), 2_000);
        let c = hash_leaf(&pk(3), 3_000);
        let root = hash_node(&a, &b);
        assert!(!verify_proof(&[c], &root, a));
    }
}
