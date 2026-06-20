# lofi-solana — Vision

> **Make a beat. Coin it. Earn when people listen.**

A browser studio where anyone makes an original lofi track in a few minutes, then
"launches" it as a tradeable token on Solana. The song's on-chain coin is the unit
of ownership, virality, and monetization: as a song gets listened to and traded,
**the person who made it earns** — funded by the token's trading fees.

Think **pump.fun for songs you actually make**, where listens — not just speculation —
drive who gets paid.

---

## The insight

Three things became true at the same time:

1. **Launching a token is now a one-tap, sub-cent action** (pump.fun: 11.9M+ tokens,
   bonding-curve launches, native creator-fee sharing across up to 10 wallets).
2. **You can make genuinely good lofi entirely in a browser** (Web Audio / Tone.js +
   music-theory helpers + optional AI seeding), with a *deterministic* render so the
   output is original and cleanly ownable.
3. **Creator monetization on these rails is brutally thin** — pump.fun pays *deployers*
   for trading volume, not *creators* for making something worth listening to.

lofi-solana sits in that gap: the **creation tool is the launchpad**, and **listens are
a first-class economic signal**, not an afterthought.

No indexed competitor in 2026 does exactly this loop — make-in-browser → coin-it →
listens-drive-value. The lane is open (and trivially cloneable, so speed matters).

---

## How it works (60-second version)

```
  ┌── STUDIO ──────────┐     ┌── LAUNCH ─────────┐     ┌── LISTEN & TRADE ────────┐
  │ make a lofi loop   │     │ name + cover      │     │ anyone streams (no wallet)│
  │ in the browser     │ ──▶ │ one-tap coin it   │ ──▶ │ fans buy/sell the coin    │
  │ (Tone.js engine)   │     │ (pump.fun rail)   │     │ trading fees accrue       │
  └────────────────────┘     └───────────────────┘     └──────────┬───────────────┘
                                                                   │
                          ┌── EARN ───────────────────────────────▼───────────────┐
                          │ verified listens weight an epoch payout; trading-fee   │
                          │ revenue flows to the CREATOR (+ a capped listener pool)│
                          │ via an on-chain cumulative Merkle claim.               │
                          └────────────────────────────────────────────────────────┘
```

1. **Make** — A cozy step-sequencer studio. Drums, jazzy 7th/9th chords, bass, and a
   "lofi-ify" effect chain (vinyl crackle, tape wobble, bitcrush, lowpass, reverb).
   "Generate" buttons keep everything in-key so non-musicians get good results fast.
2. **Coin** — Render the track, upload audio + cover, and launch a token for it on
   pump.fun. The user signs in their own wallet (non-custodial). The coin's metadata
   embeds the playable song.
3. **Listen** — Anyone can stream for free (no wallet needed — this is the virality
   engine). A proof-of-listen pipeline counts *qualified* plays and resists bots.
4. **Trade** — Fans buy/sell the song-coin on pump.fun's bonding curve / PumpSwap.
   Every trade pays a creator fee.
5. **Earn** — Each epoch, trading-fee revenue is distributed: the **creator** gets the
   majority (active labor), with a smaller, capped **listener-reward** pool weighted by
   verified listens. Payouts are claimed on-chain via a Merkle distributor.

Details: [tokenomics](02-tokenomics.md) · [proof-of-listen](03-proof-of-listen.md) ·
[architecture](01-architecture.md).

---

## What makes it different (and defensible)

- **Listens are the moat.** pump.fun coins are pure speculation; here the asset has a
  consumable, sticky product (music) and an engagement signal that's expensive to fake.
- **Creation = distribution.** Every song is a shareable page with an embedded player
  and a live coin — the unit of virality *is* the product.
- **Clean IP by construction.** A *hybrid* engine (AI may suggest chords/melody, but a
  deterministic synth/sample engine renders the audio from a **CC0** asset base) keeps
  outputs original and legitimately ownable — unlike pure prompt-to-song AI, which the
  US Copyright Office says isn't copyrightable.

---

## The honest risks (we design around these from day one)

| Risk | Why it's existential | Where we address it |
|---|---|---|
| **Securities law** | Paying *passive holders* yield from fees/listens ≈ an investment contract (Howey). Killed Royal & Opulous. | [legal](04-legal-and-risk.md) — pay **creators** (labor), not passive holders; rewards are discretionary, never "ROI". |
| **Bot-farmed listens** | "More listens → more money" is a money-printer for bots. | [proof-of-listen](03-proof-of-listen.md) — Audius-style attestation + economic dampers. |
| **Rugs / pump-and-dump** | The whole category's reputation problem (Believe → 99.8% crash). | Lock metadata at launch, vest creator allocation, no holder-wipe migrations. |
| **Post-launch listen cliff** | Every precedent shows engagement craters after the hype. | Utility sinks, leaderboards, "radio" discovery, creator tooling. |

We treat these as **product requirements**, not disclaimers. See
[precedents](research/findings.md#13-web3-music--memecoin-precedents) for the graveyard
we're learning from.

---

## The phased bet

- **Phase 0 — Prototype (this scaffold):** studio that makes a real lofi loop; launch
  flow stubbed against pump.fun; rewards program skeleton; proof-of-listen v1 design.
- **Phase 1 — Devnet alpha:** real pump.fun launch (PumpPortal), R2 storage,
  trusted-signer oracle, creator-only payouts.
- **Phase 2 — Mainnet beta:** embedded-wallet onboarding (Privy), gasless launches,
  listener-reward pool, decentralized oracle (Switchboard), Arweave permanence.
- **Phase 3 — Own the rail:** optionally our own branded bonding curve (Meteora DBC),
  mobile, AI co-producer, discovery/radio.

Full plan: [roadmap](05-roadmap.md).

> ⚠️ This is a research scaffold, not a product or legal/financial advice. Tokenized
> assets carry real regulatory risk; get securities + IP counsel before any mainnet
> launch. See [legal](04-legal-and-risk.md).
