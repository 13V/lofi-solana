# Architecture

A pnpm + Turborepo monorepo: a Next.js web app (studio + player + launchpad UI), a shared
TypeScript SDK (launch adapters, proof-of-listen, rewards math), and an Anchor program
(the on-chain vault + Merkle distributor + oracle verification).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  apps/web  (Next.js, App Router)                                              │
│                                                                               │
│   Studio ────────┐    Track page ───────┐     API routes                      │
│   Tone.js engine │    player + trade UI  │     /api/launch   /api/listens      │
│   (lib/engine)   │    (heartbeats)       │        │              │             │
└───────┬──────────┴───────────┬───────────┴────────┼──────────────┼────────────┘
        │ render WAV            │ heartbeats         │ build tx     │ qualify
        ▼                       ▼                    ▼              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  packages/sdk  (@lofi/sdk)                                                    │
│   launch/         listen/            rewards/           metadata.ts           │
│   ├ pumpfun  ◀──▶ ├ session (HMAC)   ├ merkle (keccak)  (Metaplex audio JSON)  │
│   ├ meteora       ├ qualify          └ distribution                            │
│   └ provider IF   └ client                                                     │
└───────┬──────────────────────┬───────────────────────┬───────────────────────┘
        │ create-token tx       │ qualified listens      │ epoch plan + root
        ▼                       ▼                         ▼
┌──────────────┐      ┌──────────────────┐      ┌──────────────────────────────┐
│  pump.fun     │      │ off-chain listen │      │ programs/lofi_rewards (Anchor)│
│  (PumpPortal /│      │ ledger + oracle  │──────▶│  Config · Song · SongVault    │
│   pump-sdk)   │      │ signer (server)  │ sign  │  Distributor · ClaimStatus    │
└──────┬────────┘      └──────────────────┘       │  set_epoch_root / claim       │
       │ creator fees ──────────────────────────▶ │  (Ed25519 + Merkle verify)    │
       ▼                                           └──────────────────────────────┘
   SongVault PDA  ◀───────────────────────────────────────┘
```

## Components

### `apps/web` — the studio + launchpad
- **Studio** (`/studio`): a 16-step sequencer built on **Tone.js v15**. Drums, FM-Rhodes
  chords, bass, and a "lofi-ify" effect chain. **`tonal`** generates in-key progressions
  so non-musicians get musical results. Render to WAV via `Tone.Offline`.
- **Track page** (`/track/[id]`): cover, player (fires listen heartbeats), live price/
  marketcap (mock → on-chain), and a creator-earnings/claim widget.
- **API routes**: `/api/launch` (builds the create-token tx via the SDK; user signs in
  their wallet), `/api/listens` (heartbeat ingest → validate → qualified-listen ledger).
- **Wallet**: `@solana/wallet-adapter` for v1 (note: migrate to `@solana/kit` per
  [research](research/findings.md#4-solana-dapp-tech-stack)). Embedded wallets (Privy) for
  mainstream onboarding in Phase 2.

### `packages/sdk` — `@lofi/sdk`
Framework-agnostic logic shared by the app and any backend job:
- **`launch/`** — a `LaunchProvider` interface with two implementations:
  `PumpPortalLaunchProvider` (default; non-custodial `trade-local`) and
  `MeteoraDbcLaunchProvider` (our-own-branded-curve path). Swapping rails = swapping one
  factory call.
- **`listen/`** — HMAC session tokens, qualification rules, browser heartbeat reporter.
- **`rewards/`** — a **real** cumulative-Merkle implementation whose leaf/node byte format
  **must stay identical** to the on-chain program, plus `computeEpochPlan` (the split math).
- **`metadata.ts`** — Metaplex audio metadata JSON (`category: "audio"`, `animation_url`
  = the mp3) so wallets/marketplaces render a player.

### `programs/lofi_rewards` — Anchor program
The trust-minimized payout rail. Accounts: `Config`, `Song`, `SongVault` (holds SOL),
`Distributor` (cumulative Merkle), `ClaimStatus`. Instructions: `init_config`,
`register_song`, `fund_vault`, `set_epoch_root` (oracle-gated), `claim`. See its
[README](../programs/lofi_rewards/README.md).

## Data flow: create → listen → earn
1. **Create** — Studio renders a WAV → encode to MP3 → upload audio + cover →
   build metadata JSON.
2. **Launch** — `/api/launch` builds a pump.fun create-token tx (audio URI in metadata);
   the user signs in their wallet; `register_song` records it on our program.
3. **Listen** — Players stream freely; heartbeats → qualified-listen ledger.
4. **Trade** — Fans trade the coin on pump.fun; creator fees accrue to the `SongVault`.
5. **Earn** — Nightly epoch: compute `(wallet → cumulative amount)`, sign the root, post
   it; users `claim`.

## Tech stack (recommended, 2026)

| Layer | Choice | Notes |
|---|---|---|
| Monorepo | pnpm + Turborepo | `apps/*`, `packages/*`; `programs/` is its own Anchor/Cargo toolchain |
| Web | Next.js 15 (App Router), React 19, Tailwind v4 | |
| Audio | Tone.js ^15 + tonal ^6 + audiobuffer-to-wav | hybrid synth/sample, CC0 assets |
| Encode | `@mediabunny/mp3-encoder` (WASM LAME, worker) | ~2 MB / 2-min track @128–160kbps |
| Chain client | `@solana/wallet-adapter` + web3.js v1 (→ `@solana/kit`) | wallet-adapter↔kit friction noted |
| Program | Anchor (Rust) | cumulative Merkle distributor + Ed25519 oracle verify |
| Launch rail | pump.fun via PumpPortal `trade-local` (→ `@pump-fun/pump-sdk`) | Meteora DBC alt for own launchpad |
| RPC | Helius (DAS + webhooks) | track holders/trades without a custom indexer |
| Storage | **v1** Cloudflare R2 ($0 egress) · **v2** Arweave/Irys (pay-once, permanent) | metadata JSON < 100 KiB free on Irys |
| Onboarding | Phase 2: Privy embedded wallets + Kora gasless + Stripe on-ramp | "log in with email, get a wallet" |
| Oracle | **v1** trusted signer (Ed25519) · **v2** Switchboard On-Demand (TEE) | not Pyth/Chainlink (price-only) |

## Launch-rail abstraction (resolving "our launchpad" vs "pump.fun")
Your brief had both *"a launchpad we make"* and *"launch on pump.fun"*. We reconcile them:
**our app is the launchpad experience** (make-a-song → coin-it), and the underlying token
rail is **pluggable**. Default = pump.fun (liquidity + attention). Later, `MeteoraDbcLaunchProvider`
lets us run our **own branded bonding curve** (custom curve, Jupiter routing, no meme
baggage) — the same UI, different rail. Decision deferred behind the `LaunchProvider`
interface so it costs us nothing to switch.

See [research findings](research/findings.md) for the evidence behind every choice above.
