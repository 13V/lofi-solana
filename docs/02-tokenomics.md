# Tokenomics — how "listens → earnings" actually works

This is the heart of the product, and the part with the most subtlety. Your original
idea was: *"the more listens a song gets, the more we pay the people who made the token,
with trading fees."* The mechanics below make that real **while staying as far as
possible from looking like a security** (see [legal](04-legal-and-risk.md)).

---

## 1. Where the money comes from: pump.fun creator fees

When a song launches as a coin on pump.fun, **every trade pays a creator fee**. As of
2026 this is **market-cap-tiered**: ~**0.95%** at small caps, scaling down to ~**0.05%**
above ~$20M market cap (the protocol also takes a separate fee; LPs earn a separate
fee). Two pump.fun primitives make this product possible:

- **Creator Fee Sharing** — creator fees can be split across **up to 10 wallets** with
  assigned percentages, configurable after launch. One of those wallets can be a
  treasury/program-controlled address.
- **"Creator Fees" vs "Trader Cashback"** — a permanent choice at launch. We **always
  choose Creator Fees** (Cashback forfeits 100% of the revenue our model depends on).

> **The load-bearing unknown:** can a *program PDA* be set as the pump.fun `coin_creator`
> and claim fees via CPI, or must the recipient be a normal wallet (EOA)? This determines
> whether fees flow *trustlessly* into our vault (v2) or via a platform-controlled
> fee-share wallet that forwards them (v1, safe). **Verify on devnet before committing.**
> See [research: pump.fun economics](research/findings.md#1-pumpfun-economics--creator-revenue).

```
trader buys/sells song-coin
        │  pays ~0.05–0.95% creator fee (SOL)
        ▼
pump.fun creator-fee accrual  ──(claim)──▶  SongVault PDA (our program)
```

## 2. Where the money goes: the split you chose

> **Decision (yours):** the **full "listens → holders" split** — trading-fee revenue
> flows to the community that holds the song-coin, weighted by verified listens. It's the
> highest-alignment option with your original vision, and — candidly — the
> highest-regulatory-risk one. We implement it as the default and document the guardrails.

| Bucket | Default | How it's weighted |
|---|---:|---|
| **Listeners** | **50%** | Pro-rata by *verified listens* (hold-gated, per-wallet cap, decay). This is the "more listens → more earnings" engine. |
| **Holders** | **35%** | Pro-rata by token balance at a time-weighted snapshot (TWAB). |
| **Creator** | **15%** | A standing royalty to the wallet that made the track. |

100% of the epoch pool is distributed by default; lower any bucket to carve out a
platform/liquidity cut (the remainder simply stays in the `SongVault`). Defaults live in
`packages/sdk/src/config.ts` (`DEFAULT_DISTRIBUTION_PARAMS`) and are tunable per song.

**Listens drive earnings two ways:**
1. **Directly** — qualified listens weight the (dominant) listener bucket.
2. **Indirectly** — listens make a song *trend* → more trading → a bigger fee pool.

> 🔴 **The catch you accepted.** Paying holders ongoing income weighted by engagement is,
> under the March 2026 SEC/CFTC framework, close to a textbook **investment contract** —
> it's what sank Royal & Opulous. With this model the "rewards, not an investment" framing
> is hard to sustain. **Hard gates before any mainnet payout:** a securities opinion,
> geoblocking (US + sanctioned + UK), zero profit marketing, locked metadata, creator
> vesting. A lower-risk fallback (creator-primary + a capped listener pool) is *one config
> change away*. Full analysis: [legal](04-legal-and-risk.md).

## 3. The payout machine: vault → epoch → cumulative Merkle claim

Per-listen on-chain writes are uneconomical and a DoS vector, so we batch.

```
        off-chain (server)                         on-chain (lofi_rewards program)
 ┌───────────────────────────┐
 │ collect qualified listens │
 │ snapshot holders (TWAB)   │
 │ read SongVault balance    │
 │ compute EpochPlan:        │            set_epoch_root(root, total, epoch)
 │   cumulative (wallet→amt) │  ── sign ──▶  ├─ verify Ed25519 oracle attestation
 │ build Merkle tree         │   (oracle)    ├─ move `total` SOL  SongVault → Distributor
 │ post root + leaf data     │               └─ store root, bump epoch
 └───────────────────────────┘
                                            claim(amount, proof)   ◀── user
                                              ├─ recompute leaf, verify proof vs root
                                              ├─ pay (amount − already_claimed)
                                              └─ update ClaimStatus
```

- **`SongVault` PDA** accumulates creator-fee SOL (from pump.fun + any `fund_vault`).
- Each **epoch** (e.g. daily), the server computes a **cumulative** `(wallet → amount)`
  table, builds a Merkle tree, and the **oracle** signs the root. The program verifies
  that signature via the **Ed25519 precompile** (instruction introspection) before
  accepting the root and moving funds.
- Users **claim** with a Merkle proof. Cumulative amounts mean one `ClaimStatus` per
  wallet and the ability to batch-claim across epochs; claimers pay their own gas.
- Mechanism details: [research: revenue distribution](research/findings.md#12-revenue-distribution-on-solana)
  and [research: oracle bridge](research/findings.md#11-on-chain-oracle--data-bridge).
  Fork target: `jito-foundation/distributor` (cumulative variant).

## 4. Anti-rug / trust design (learned from the graveyard)

Believe (99.8% crash, mutable metadata), Royal (securities), and STEPN (emission death
spiral) all teach the same lessons:

- **Lock metadata + choose Creator Fees at launch** (immutable post-launch params).
- **Vest the creator's allocation** so day-one dumps aren't profitable.
- **Pro-rata from a *fixed pool*, never fixed-per-listen** — fake volume only dilutes the
  attacker, and there's no inflationary emission to spiral.
- **No holder-wipe migrations.** Cumulative claims never expire mid-flight.
- **Utility sink** (à la time.fun): the token unlocks something (presales, fan perks,
  remix rights), so it isn't purely a price bet.

## 5. Worked example

A song does **$1,000,000** lifetime trading volume at a ~0.6% effective creator fee →
**~$6,000** in creator fees land in the `SongVault`.

With the default split: **listeners ≈ $3,000** (spread across verified, hold-gated
listeners, capped per wallet), **holders ≈ $2,100** (pro-rata by balance), **creator ≈ $900**.

For meaningful payouts a song needs sustained six-figure-plus volume — i.e. it needs to
be *good and listened-to*, which is exactly the incentive we want. (Reference points:
pump.fun paid creators >$350M in a trailing year; top individual creators have cleared
$90k+ in weeks — but the long tail earns little, like every creator platform.)

---

### Open tokenomics questions (track these)
- Snapshot gaming: use **time-weighted** balances (TWAB) over the epoch, not a single slot.
- You chose the **full listens→holders split**. Creator-primary (or creator + a capped
  listener pool) remains a one-config-change **lower-risk fallback** if counsel pushes back
  — keep it warm.
- Dust / abandoned claims → roll forward; set a min-claim threshold.
- Tax: receipt is ordinary income at claim (claim-based timing is cleaner; 1099-DA era).
