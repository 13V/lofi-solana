# lofi.sol — Web App

The browser-based music studio and song-coin marketplace for the lofi.sol platform.

## Stack

| Layer | Library |
|-------|---------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Audio | Tone.js 15 |
| Theory | tonal 6 |
| State | Zustand 5 |
| Wallet | @solana/wallet-adapter-react |
| Chain | @solana/web3.js 1.95 |
| SDK | @lofi/sdk (workspace) |

## Getting started

```bash
# From monorepo root
pnpm install
pnpm dev --filter web

# Or from this directory
cd apps/web
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Add drum samples

The studio engine requires CC0 WAV samples placed in `public/samples/`.
See [`public/samples/README.md`](./public/samples/README.md) for filenames and sources.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_RPC_URL` | Devnet public endpoint | Solana RPC URL |
| `SESSION_SECRET` | — | Server secret for listen HMAC (TODO) |
| `SOLANA_RPC_URL` | — | Server-side RPC for launch API (TODO) |

Create a `.env.local` file:

```bash
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
SESSION_SECRET=change-me-in-production
SOLANA_RPC_URL=https://api.devnet.solana.com
```

## Architecture

```
app/
  layout.tsx          Root layout + wallet providers
  page.tsx            Landing / marketplace
  studio/page.tsx     Interactive beat studio (client)
  track/[id]/page.tsx Song-coin detail page
  api/
    launch/route.ts   Build pump.fun launch tx
    listens/route.ts  Listen heartbeat + qualification

lib/
  engine/
    engine.ts         LofiEngine (Tone.js, main audio class)
    lofiChain.ts      Effects chain (saturation→crush→LPF→reverb)
    theory.ts         tonal helpers (progressions, scale notes, patterns)
    presets.ts        Studio presets
  listen/
    useListenHeartbeat.ts  Qualified-listen hook
  store.ts            Zustand studio state

components/
  studio/
    StepGrid.tsx      16-step drum sequencer UI
    ChordPanel.tsx    Key selector + progression generator
    Transport.tsx     Play/stop, BPM, swing, presets, export WAV
    LaunchDialog.tsx  Coin-launch flow (name/ticker/cover → wallet sign)
  SongCoinCard.tsx    Trending grid card
  Player.tsx          Audio player with listen heartbeat
```

## Stubbed / TODO

- `app/api/launch/route.ts` — needs Arweave upload + SDK LaunchProvider
- `app/api/listens/route.ts` — needs Redis dedup + on-chain counter
- `app/track/[id]/page.tsx` — needs real on-chain data fetch
- Buy/Sell panel — needs pump.fun SDK integration
- Claim button — needs Merkle proof from @lofi/sdk/rewards
- Wallet → @solana/kit migration (see `app/providers.tsx` comment)
