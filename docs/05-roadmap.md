# Roadmap

Phased so the riskiest assumptions get tested cheaply and the legally-loaded parts come
*after* counsel. Each phase lists the bet it de-risks.

## Phase 0 — Prototype scaffold ✅ (this repo)
**Bet: can we make a genuinely good lofi track in the browser, and is the end-to-end
shape coherent?**
- [x] Monorepo (pnpm + Turborepo), docs, research appendix.
- [x] Studio engine (Tone.js): step sequencer, in-key chord generation, lofi FX chain,
      WAV render.
- [x] `@lofi/sdk`: `LaunchProvider` interface, proof-of-listen primitives, **real**
      cumulative-Merkle + distribution math, metadata builder.
- [x] `lofi_rewards` Anchor program skeleton: vault, cumulative Merkle distributor,
      Ed25519 oracle verification.
- [ ] Wire the studio store ↔ engine; add CC0 drum samples; make the loop audibly play.

## Phase 1 — Devnet alpha
**Bet: does "make → coin → it shows up tradeable" actually work on real rails?**
- Real pump.fun launch via **PumpPortal `trade-local`** (user signs in-wallet).
- **Pinata/IPFS** metadata + cover; **Cloudflare R2** for audio; MP3 encode in a worker.
- Deploy `lofi_rewards` to **devnet**; `register_song` on launch.
- **Verify the load-bearing unknown:** can a PDA be the pump.fun `coin_creator` and claim
  fees via CPI? If not, use a platform fee-share wallet → `fund_vault`.
- Proof-of-listen **v1**: HMAC sessions + heartbeats + per-wallet/IP rate limits.
- **Creator-only** payouts; trusted-signer oracle (`set_epoch_root`); manual epoch cron.
- Internal/whitelist users only; no public money.

## Phase 2 — Mainnet beta (gated by legal + anti-bot)
**Bet: will non-crypto music fans onboard, and can we pay creators without it looking
like a security?**
- **Securities + IP opinion** in hand; ToS, DMCA agent, geoblocking, CC0 enforcement.
- **Embedded wallets (Privy)**: email/social login → self-custodial wallet; **Kora**
  gasless launches; **Stripe** on-ramp. "Log in, make a song, coin it — no SOL needed."
- Anti-bot **v2**: anomaly scoring; introduce the **capped listener-reward pool**.
- **Switchboard On-Demand** (TEE) oracle to decentralize the signer.
- **Arweave/Irys** permanence (R2 as hot cache).
- Discovery: trending board, "lofi radio" autoplay, shareable OG song-coin cards, referrals.

## Phase 3 — Own the rail + scale
**Bet: can we capture more value and retain listening beyond launch hype?**
- Optional **own branded bonding curve (Meteora DBC)** via the existing `LaunchProvider` —
  same UI, our economics, Jupiter routing.
- **AI co-producer** (hybrid: AI seeds chords/melody → our deterministic render).
- Mobile app; creator analytics + payout dashboard.
- Utility sinks: token-gated stems/remix rights, fan presales, collabs.
- Migrate client to **`@solana/kit`**; harden indexer on **Helius** webhooks.

## Cross-cutting "do not ship without"
- 🔴 Securities opinion before any public payout.
- 🔴 Anti-bot proven before the listener-reward pool goes live.
- 🔴 Metadata locked + creator vesting on every launch (no mutable-metadata rug vector).
- 🟠 CC0-only asset base, warranted in ToS; DMCA safe-harbor process live.

## Product decisions
- ✅ **Payout model:** full **listens → holders** split (50/35/15 listeners/holders/creator).
  Highest alignment, highest legal risk — securities opinion is a hard gate (see legal).
- ✅ **Launch-rail default:** **pump.fun** (PumpPortal); Meteora-DBC kept behind the
  `LaunchProvider` interface for a future own-rail.
- ⬜ **Brand name** — still open. Shortlist in
  [research: product/UX](research/findings.md#15-product-ux-onboarding--gtm)
  (Loopcoin, Crackle, Sidechain, Hum, …).
