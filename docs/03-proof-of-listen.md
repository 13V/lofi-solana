# Proof-of-Listen — counting real plays, resisting bots

"More listens → more earnings" is, unmitigated, a **money-printing target**. This is the
single hardest technical problem in the product. Audius — the closest prior art, also on
Solana — proved that naïve on-chain play-counting gets gamed; their answer (and ours) is:
**count plays off-chain, gate payouts behind a signed anti-abuse attestation, and make
botting economically pointless even if it gets through.**

Treat every listen as untrusted until proven otherwise.

---

## What counts as a "qualified listen"

Borrowed from streaming-industry norms (Spotify's 30-second rule) plus completion:

- **≥ 30 seconds** of continuous playback, **and**
- **≥ 50%** of the track completed, **and**
- monotonic playback position (no seek-spamming to fake progress), **and**
- one qualified listen per `(track, listener, time-window)` — de-duplicated.

Implemented in `packages/sdk/src/listen/qualify.ts`.

## The pipeline (layered defense)

```
 browser player ──HMAC session──▶ heartbeats (~10s, signed) ──▶ server validation
        │                                                            │
        │  enforce ≥30s/≥50% client-side (UX)        de-dupe + heuristics + rate-limit
        ▼                                                            ▼
   shareable, walletless                                  "qualified listen" ledger
   (virality)                                                        │
                                              periodic Merkle commit (oracle-signed) ──▶ chain
```

| Layer | v1 (cheap, good-enough) | v2 (robust) |
|---|---|---|
| **Session** | Server mints a short-lived **HMAC** token at play-start (secret, exp, listenerId, trackId, IP-bound); client echoes it | + device fingerprint binding; rotating keys |
| **Liveness** | Heartbeats every ~10s carrying monotonic audio position; require ≥30s continuous + ≥50% | Server-issued per-heartbeat nonces; inter-ping jitter analysis |
| **Anti-sybil** | Rate-limit **per wallet AND per IP/device**; wallet-age floor; light PoW/CAPTCHA on suspicious sessions | Audius-style **anti-abuse oracle** scoring (stream/listener ratios, geo/temporal anomalies) signs each batch |
| **Counting** | De-dupe to one qualified listen per (listener, track, window); aggregate off-chain | ML anomaly model over the listen graph |
| **On-chain** | **Batch/Merkle-commit** counts hourly/daily (never per-listen) | Attestation quorum / multi-signer |

The single most useful signal isn't any per-session check (a determined attacker scripts
a headless player) — it's the **aggregate anomaly layer**: 200k streams from 4k unique
listeners, <1% save/follow rate, single-metro 48h spikes with no social signal. Spotify
catches fraud behaviorally, not technically; so do we.

## Economic hardening — make botting unprofitable even if it works

This is the real defense. Even a *successful* bot should not net a profit:

1. **Pro-rata from a fixed pool**, not fixed-per-listen → fake listens only dilute the
   attacker's own share (and everyone's), they don't mint new money.
2. **Cap reward per listener, per track, per day** (diminishing → zero) → kills repeat-farming.
3. **Require holding the song's token to earn** + **wallet-age floor** → forces real
   capital at risk per sybil identity, so fresh-mint farms are worthless.
4. **Decay** reward weight by per-listener frequency → value accrues to genuine, varied,
   sustained listening, not bursts.

## Bridging counts on-chain (the oracle)

The program never sees raw listens — only an **oracle-signed epoch root**:

- **v1 — trusted signer.** Our server holds a keypair and signs
  `(song_mint, epoch, root, total)`. The `lofi_rewards` program verifies it via the
  native **Ed25519 precompile (~2,280 CU)** + instruction introspection before accepting
  the root. Cheap, simple; trust assumption = "don't lose the key" (use KMS/HSM).
- **v2 — decentralize.** Replace the lone signer with **Switchboard On-Demand** (TEE-
  attested) or a threshold multisig, so the *computation itself* becomes attestable. Pyth/
  Chainlink are price-feed products — **not** a fit for arbitrary listen data.

Mechanism + costs: [research: oracle bridge](research/findings.md#11-on-chain-oracle--data-bridge).

---

### Open questions
- A TEE (v2) is the only way to make the off-chain *computation* trustless; v1 is "trust
  the platform." Be transparent about which you're running.
- Privacy: device fingerprinting + IP heuristics carry GDPR/CCPA obligations.
- There is **no peer-reviewed "proof-of-listen" standard** — this is bespoke; expect an
  arms race and budget for ongoing tuning.
- Data availability: if you only post a Merkle *root*, you must reliably host the full
  leaf set + proofs (API + Arweave mirror) or users can't claim.
