<div align="center">

# 🎧 lofi-solana

### Make a beat. Coin it. Earn when people listen.

A browser studio where anyone makes an original lofi track, launches it as a tradeable
token on Solana, and earns from trading fees — weighted by **verified listens**.
*pump.fun for songs you actually make.*

</div>

> [!WARNING]
> **This is a research scaffold, not a product, and not legal or financial advice.**
> Tokenizing songs that pay out revenue carries real securities, IP, and AML risk.
> Read [`docs/04-legal-and-risk.md`](docs/04-legal-and-risk.md) and get qualified counsel
> before anything touches mainnet. Most network calls here are stubbed.

---

## The idea in one breath

Three things are newly true: launching a token is a one-tap, sub-cent action (pump.fun);
you can make genuinely good lofi entirely in a browser (Tone.js); and creator
monetization on these rails is thin. lofi-solana sits in that gap — **the creation tool
*is* the launchpad**, and **listens are a first-class economic signal**, not an
afterthought. No one in 2026 does exactly this loop yet.

```
 make a lofi loop ──▶ one-tap coin it ──▶ fans listen (free) & trade ──▶ creator earns
   (Tone.js studio)     (pump.fun rail)      (proof-of-listen)          (on-chain claim)
```

Full thinking: [`docs/00-vision.md`](docs/00-vision.md).

## How earnings actually work (the subtle part)

Trading fees on a song-coin accrue to an on-chain **`SongVault`**. Each epoch, that
revenue is distributed via a **cumulative Merkle claim** — but paying *passive holders*
yield looks like a security (this killed Royal & Opulous). So the model pays the
**creator** (active labor → defensible) as the headline, with an optional **capped,
discretionary listener-reward pool** weighted by *qualified* listens — never marketed as
ROI. Listens mostly earn *indirectly*: they make a song trend → more trading → more fees.

→ [`docs/02-tokenomics.md`](docs/02-tokenomics.md) ·
[`docs/03-proof-of-listen.md`](docs/03-proof-of-listen.md)

## Repository layout

```
lofi-solana/
├── docs/                       # the strategy: vision, architecture, tokenomics, legal…
│   ├── 00-vision.md            # the concept & the bet
│   ├── 01-architecture.md      # system design + tech stack
│   ├── 02-tokenomics.md        # listens → fees → payouts (the core mechanic)
│   ├── 03-proof-of-listen.md   # counting real plays, beating bots
│   ├── 04-legal-and-risk.md    # the risk register (read this)
│   ├── 05-roadmap.md           # phased plan
│   └── research/findings.md    # condensed output of all 15 research agents + sources
├── apps/
│   └── web/                    # Next.js studio + launchpad + player (Tone.js engine)
├── packages/
│   └── sdk/  (@lofi/sdk)        # launch adapters, proof-of-listen, Merkle + reward math
└── programs/
    └── lofi_rewards/           # Anchor program: vault + cumulative Merkle distributor
                                #   + Ed25519 oracle attestation
```

## Quickstart

> Prereqs: Node ≥ 20, `pnpm`, and (for the program) Rust + the Solana/Anchor toolchain.

```bash
# 1. install JS deps (web app + sdk)
pnpm install

# 2. copy env and fill in what you need
cp .env.example .env.local

# 3. run the studio
pnpm dev            # → http://localhost:3000  (open /studio)

# 4. (optional) build & test the on-chain program
cd programs/lofi_rewards
anchor build
anchor test
```

The **studio engine** ([`apps/web/lib/engine`](apps/web/lib/engine)) is the most
fully-built part — it makes real sound. Add CC0 drum samples under
`apps/web/public/samples/` (see that folder's README) to hear the full loop.

## Key design decisions (and why)

| Decision | Choice | Why |
|---|---|---|
| **Who gets paid** | Creator-first; listener pool capped & discretionary | Avoid the Howey "passive yield" trap ([legal](docs/04-legal-and-risk.md)) |
| **Song generation** | Hybrid: AI *seeds*, deterministic engine *renders* from CC0 assets | Pure-AI output isn't copyrightable → can't be legitimately tokenized |
| **Launch rail** | Pluggable `LaunchProvider`; default pump.fun, Meteora-DBC alt | Reconciles "our launchpad" + "launch on pump.fun"; zero-cost to switch |
| **Anti-bot** | Audius-style attestation + economic dampers | "More listens → more money" is a bot magnet |
| **Payouts on-chain** | Cumulative Merkle distributor + Ed25519 oracle | Per-listen writes are uneconomical; batch & claim |
| **Storage** | v1 Cloudflare R2 → v2 Arweave/Irys | Cheap now, permanent later |

Every choice traces back to [`docs/research/findings.md`](docs/research/findings.md).

## Status — what's real vs stubbed

- ✅ **Real:** monorepo wiring; the Tone.js studio engine (sequencer, in-key chord gen,
  lofi FX, WAV render); the SDK's Merkle + distribution + qualification logic; the Anchor
  program structure (accounts, instructions, Ed25519 + Merkle verification).
- 🟡 **Stubbed / TODO:** live pump.fun launch calls, RPC/wallet wiring depth, storage
  uploads, the oracle cron, and the on-chain program is an **unaudited skeleton**.

## Decisions

- ✅ **Payout model:** full **listens → holders** split (50% listeners / 35% holders /
  15% creator). Highest alignment with the vision, highest legal risk — guardrails in
  [`docs/04-legal-and-risk.md`](docs/04-legal-and-risk.md). A lower-risk fallback is one
  config change away (`DEFAULT_DISTRIBUTION_PARAMS`).
- ✅ **Launch-rail default:** **pump.fun** (via PumpPortal). Meteora-DBC stays behind the
  same `LaunchProvider` interface for a future own-rail.
- ⬜ **Brand name** — still open. Shortlist: **Loopcoin · Crackle · Sidechain · Hum ·
  Lofify · Tape …** (repo uses `lofi-solana` / `@lofi/*` as a placeholder scope).

---

<div align="center">
<sub>Built from a 15-agent research fan-out. Numbers and regulatory readings are
mid-2026 and point-in-time — verify before you build on them.</sub>
</div>
