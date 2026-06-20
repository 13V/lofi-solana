# Research Findings (15 agents)

Condensed, faithful summaries of the 15-agent research fan-out that informed this
scaffold. Each section: **bottom line**, key specifics, and top sources. Dates are
mid-2026; crypto specifics move fast — re-verify before building on any single number.

---

## 1. pump.fun economics & creator revenue
**Bottom line:** Creator fees route on-chain to a protocol-owned PDA keyed on the
"coin creator" address; that `coin_creator` field *can be an arbitrary address* — so a
program-controlled vault *may* be able to receive a song's creator fees. **Verify on
devnet** whether a PDA can sign `collect_coin_creator_fee` via CPI — this is the single
highest-risk assumption in the whole design.
- Fees are **market-cap-tiered**: ~0.95% small-cap → ~0.05% above ~$20M MC; traders pay,
  creator/protocol/LPs receive. PumpSwap (post-graduation AMM): 0.05% protocol / 0.20% LP
  + tiered creator.
- **Creator Fee Sharing** (Jan 2026): split fees across **up to 10 wallets**, configured
  post-launch; claims permissionless & permanent.
- **Creator Fees vs Trader Cashback** (Feb 2026): permanent launch choice; **always pick
  Creator Fees** (Cashback sends 100% to traders).
- Scale: >$350M paid to creators in a trailing year; $2M in the new model's first 24h; top
  creators $90k+ in weeks — but payouts scale with *trading volume*, not listens directly.
- `admin_set_coin_creator` exists (pump.fun admin can reassign) — a centralization vector.
- Sources: https://pump.fun/docs/fees · https://github.com/pump-fun/pump-public-docs/blob/main/docs/PUMP_SWAP_CREATOR_FEE_README.md · https://bravenewcoin.com/insights/pump-fun-introduces-creator-fee-sharing-system-to-rebalance-platform-incentives · https://crypto.news/pump-fun-flips-creator-fees-launches-trader-cashback/

## 2. pump.fun programmatic launch
**Bottom line:** For users launching their own song-tokens, use **PumpPortal's Local
(non-custodial) API** — backend builds the create tx, the user signs in-browser, never
custodial. Longer-term, the official **`@pump-fun/pump-sdk`** `createAndBuyInstructions`
drops PumpPortal's 0.5%. Strongly consider **Meteora DBC** to run your *own* branded
launchpad.
- PumpPortal Local: `POST https://pumpportal.fun/api/trade-local` (0.5% fee); Lightning
  (custodial) `…/api/trade` (1%). Create+dev-buy in one tx; `pool` can be
  `pump|raydium|pump-amm|launchlab|bonk|auto`. WebSocket data at `wss://pumpportal.fun/api/data`.
- Official program id `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`; SDK `@pump-fun/pump-sdk`;
  `createV2` is a normal user-signed instruction (no special authority) — clean for "user owns the token."
- Metadata now via your own **Pinata** upload (`uploads.pinata.cloud/v3/files`).
- pump.fun is effectively **mainnet-only**; test via the SDK's local-validator script, not devnet.
- Alternatives: bonk.fun (~1%, creators get more), Raydium LaunchLab (flexible curves),
  **Meteora DBC** (`MeteoraAg/dynamic-bonding-curve` — own branded curve, Jupiter routing).
- Sources: https://pumpportal.fun/creation/ · https://www.npmjs.com/package/@pump-fun/pump-sdk · https://docs.meteora.ag/developer-guide/invent/scaffolds/fun-launch · https://github.com/MeteoraAg/dynamic-bonding-curve

## 3. Solana token standards & on-chain royalties
**Bottom line:** pump.fun mints **legacy SPL**, not Token-2022 — so you can't bolt a
transfer-fee onto a pump.fun coin; fund payouts from pump.fun's **protocol creator-fee
split** (claimed via `collect_creator_fee`) routed to your vault. If you self-issue,
**Token-2022 Transfer Fee** is the right skim primitive + **Metadata/Metadata-Pointer**
for song data.
- Token-2022 Transfer Fee: withholds bps (cap = 10000 = 100%) into recipient accounts;
  `HarvestWithheldTokensToMint` → `WithdrawWithheldTokensFromMint`. Fee changes take effect
  +2 epochs; accounts can't close with nonzero withheld.
- Transfer Hook: CPIs your program on every transfer **but source/dest are read-only** — it
  can *observe/reject/meter*, **not** move value. Pair with Transfer Fee for actual skim.
- Fee-on-transfer tokens break naive AMM routing — verify DEX support before relying on it.
- **Metaplex Core** (2026 default) has *enforced* royalties if you pivot to collectible
  song NFTs (vs. a liquid fungible coin).
- Sources: https://solana.com/solutions/token-extensions · https://solana.com/docs/tokens/extensions/transfer-fees · https://pumpportal.fun/creator-fee/ · https://developers.metaplex.com/smart-contracts/core

## 4. Solana dApp tech stack
**Bottom line:** Scaffold with **Anchor** (on-chain) + **@solana/kit** (client) +
**wallet-adapter / Wallet Standard** in a **pnpm + Turborepo** monorepo — the Foundation's
blessed 2026 path. Use **Helius** as primary RPC (DAS + webhooks for holder/trade tracking).
- Anchor hit **v1.0** (Apr 2026); TS client renamed `@coral-xyz/anchor` → `@anchor-lang/core`.
  Pinocchio/Steel only for compute hot-paths. *(This scaffold uses Anchor 0.30-style for
  tooling stability — note the rename when upgrading.)*
- **`@solana/kit`** (ex-web3.js v2) is production-ready; v1 is maintenance-only. Kit ↔
  wallet-adapter still has friction — **this scaffold uses web3.js v1 + wallet-adapter for
  runnability**, migrate later.
- Testing: **LiteSVM** (bankrun deprecated). RPC: Helius $49/mo dev tier; QuickNode failover.
- Sources: https://github.com/solana-foundation/anchor/releases · https://github.com/anza-xyz/kit · https://www.helius.dev/ · https://www.anchor-lang.com/docs/testing/litesvm

## 5. Browser music engine
**Bottom line:** Build the studio on **Tone.js v15** (`tone`) for sample-accurate
`Transport`, prebuilt synths/effects, and one-line offline bounce; pair with **`tonal`**
for in-key chord/scale generation so non-musicians get good results.
- v15 uses getters: `Tone.getTransport()`, `getDestination()`. `Tone.Sequence(cb, steps,
  "16n")` for the grid; `Tone.Sampler`/`Players` for drums; `PolySynth` for chords.
- React: `"use client"`, `await Tone.start()` on a user gesture, keep the audio graph in
  refs (not React state), dispose on cleanup.
- Export: `Tone.Offline(...)` → `AudioBuffer` → `audiobuffer-to-wav`. Watch: load samples
  before offline render; pad duration for reverb tails (known `Tone.Offline` quirks).
- Skip Strudel (live-coding language) / Elementary (low-level DSP) for the core.
- Sources: https://www.npmjs.com/package/tone · https://github.com/Tonejs/Tone.js · https://github.com/tonaljs/tonal · https://tonejs.github.io/examples/stepSequencer

## 6. Lofi sound design & DSP
**Bottom line:** Authentic lofi = jazzy extended chords + a deliberate degradation chain:
**saturation → bitcrush → lowpass → pitch wobble → reverb**, under **vinyl crackle** and a
**swung, sidechain-ducked** groove. All achievable with stock Tone.js nodes.
- `Tone.Chebyshev`/`Distortion` (saturation), `BitCrusher(8–12 bits)`, `Filter(6–12kHz,
  lowpass, rolloff -24)`, `Vibrato(0.2–6Hz, depth 0.05–0.2)` (tape wow), `Chorus`,
  `Reverb({decay:1.5–3, wet:0.15–0.3})` (**await `reverb.ready`**).
- **No native sidechain** in Web Audio (`DynamicsCompressor` has no sidechain input) —
  emulate by ducking a `Tone.Gain` on each kick.
- Harmony: **ii–V–I** (min7–dom7–maj7) gives automatic voice-leading; *just adding the 7th*
  is the biggest "now it's lofi" change.
- OSS references: `jacbz/Lofi`, `xisra/lofi-generator`, `mtsandra/lofi-station`,
  `gabrieldavison/engine`.
- Sources: https://tonejs.github.io/docs/14.7.77/Reverb · https://en.wikipedia.org/wiki/Ii%E2%80%93V%E2%80%93I_progression · https://github.com/jacbz/Lofi · https://github.com/WebAudio/web-audio-api/issues/246

## 7. Royalty-free samples & licensing
**Bottom line:** Because outputs are *sold/tokenized*, build on a **CC0-first** base:
**synthesize** keys/bass/pads in Tone.js (zero sample-licensing risk) + use **CC0-only**
samples (Freesound CC0-filtered, VSCO 2 Community Edition) for drums/textures. An NFT
conveys **no IP** and can't launder a dirty sample.
- Avoid GeneralUser GS / FluidR3 / Pixabay for *resale* (uncertain provenance or "no resell
  as-is" clauses). "Royalty-free" ≠ resale rights.
- SoundFont in browser: `smplr` (MIT), `spessasynth` (Apache-2.0) — but the *soundfont's*
  license ≠ the library's license; verify each.
- Synthesis (FMSynth/Karplus-Strong) is genre-appropriate for lofi and the cleanest IP.
- Payload: synth-first core ≈ 0 MB samples; add a small CC0 drum kit (~3–10 MB); lazy-load.
- Sources: https://freesound.org/browse/tags/cc0/ · https://versilian-studios.com/vsco-community/ · https://github.com/danigb/smplr · https://creativecommons.org/cc-and-nfts/

## 8. AI music generation
**Bottom line:** For a product that *sells* songs, **ownership terms beat audio quality**.
Most big generators (Suno, Udio) now grant commercial *use* but deny *ownership*. Pure
prompt-to-song output **isn't copyrightable** (USCO). **Recommended v1: a hybrid "AI-seeds
+ deterministic render" engine** — cleanest authorship + cheapest + safest to tokenize.
- If you must call an API: **Stable Audio 3.0** grants full output ownership (+ enterprise
  indemnity) — better than Suno/Udio for ownership-critical flows.
- In-browser full-song generation isn't production-ready in 2026 (WebGPU bugs, latency);
  scope on-device to **MIDI/symbolic seeding** (magenta.js).
- Hybrid: AI suggests chords/melody/drums; *your* synth/sample engine renders; the human's
  selection/arrangement/edits clear the USCO authorship bar → legitimately ownable.
- Sources: https://www.musicinafrica.net/magazine/suno-adjusts-ai-music-ownership-terms-after-warner-music-partnership · https://stability.ai/news-updates/meet-stable-audio-3 · https://www.copyright.gov/ai/ · https://magenta.github.io/magenta-js/music/

## 9. Audio export & storage
**Bottom line:** Encode in-browser to **MP3 via `@mediabunny/mp3-encoder`** (WASM LAME in a
worker) at 128–160 kbps (~2 MB / 2-min track). **v1:** store on **Cloudflare R2** ($0
egress, ~$0.45/mo for 10k songs). **v2:** **Arweave via Irys** (pay-once, ~$0.00009/song;
JSON < 100 KiB free). Skip DRM — if the token is ownership, hiding bytes is theater.
- WebCodecs does AAC/Opus but **not MP3**; WAV is ~21 MB (keep only as optional master).
- Metadata: on-chain stores only `name/symbol/uri`; the `uri` JSON (Metaplex, `category:
  "audio"`, `animation_url` = mp3) carries everything. pump.fun's metadata is flatter and
  **immutable post-mint** — use Metaplex if you want rich audio attributes.
- Stream via HTTP **range requests** (R2/S3 native); HLS is overkill for a 2-min track.
- Sources: https://mediabunny.dev/guide/extensions/mp3-encoder · https://docs.irys.xyz/overview/cost-to-upload · https://metaplex.com/docs/token-metadata/token-standard

## 10. Proof-of-listen & sybil resistance
**Bottom line:** Treat every listen as untrusted. Copy **Audius's pattern** — count plays
server-side, gate payouts behind a signed **anti-abuse attestation** before any on-chain
commit — plus economic dampers so botting can't profit. v1: HMAC heartbeats + heuristics +
per-wallet caps; defer ML/multi-node to v2.
- Qualified listen = **≥30s continuous + ≥50% completion**, monotonic position, de-duped.
- Audius gates rewards on a **quorum** (3 Discovery Nodes + 1 anti-abuse oracle, Secp256k1
  sigs). Spotify fights fraud **behaviorally** (stream/listener ratios, save rates, geo spikes).
- Economic hardening: **pro-rata from a fixed pool**, **cap per listener/day**, **require
  holding to earn**, **wallet-age floor**, **decay**.
- The aggregate anomaly layer matters more than any per-session check (attackers script
  headless players).
- Sources: https://engineering.audius.co/proposing-audio-rewards-on-solana/ · https://artists.spotify.com/artificial-streaming · https://blog.audius.co/article/audius-governance-takeover-post-mortem-7-23-22

## 11. On-chain oracle & data bridge
**Bottom line:** v1 = **DIY trusted-signer + Merkle-root commitment**: server signs an epoch
root, verified on-chain via the native **Ed25519 precompile (~2,280 CU)** + instruction
introspection; users pull-claim. v2 = **Switchboard On-Demand** (TEE) to decentralize.
**Pyth/Chainlink are price-only — not a fit.**
- Ed25519 ix layout: 14-byte offsets header + 64B sig + 32B pubkey + message; program
  asserts pubkey == oracle authority and message == `(songId, epoch, root, total)`.
- **Merkle root wins over per-song counters** at scale: one 32-byte write/epoch vs. thousands
  of rented accounts. Tx size limit 1232B caps per-tx batching.
- Costs: 5,000 lamports/sig; rent ~6,960 lamports/byte; root account ≈ one-time ~0.001 SOL.
- Single-key trust is the v1 weak point (KMS/HSM, rotation, threshold later).
- Sources: https://docs.switchboard.xyz/ · https://rareskills.io/post/solana-signature-verification · https://github.com/jito-foundation/distributor · https://solana.com/docs/core/fees/fee-structure

## 12. Revenue distribution on Solana
**Bottom line:** Use a **claim-based cumulative Merkle distributor** (fork
`jito-foundation/distributor`): one persistent per-song distributor PDA whose root you
republish each epoch, with `claimed` tracking so users batch-claim. Streaming
(Streamflow) and push-fanout (Hydra) scale badly to many small listen-weighted recipients.
- `ClaimStatus` PDA ~72 bytes (~0.0014 SOL rent); claims permissionless, claimer pays gas,
  net cost ≈ 0.00001 SOL after closing temp account.
- Cumulative root (Penguin-style): claim `merkle_amount − claimed` → reuse one ClaimStatus.
- Architecture: `SongVault` PDA accrues fees → epoch close computes weights off-chain →
  `set_root` moves the epoch pool → users claim. Governable via Squads multisig + timelock.
- Pitfalls: snapshot gaming (use **TWAB**), abandoned claims (clawback/roll-forward), dust
  (min payout), tax (income at claim).
- Sources: https://github.com/jito-foundation/distributor · https://pngfi.medium.com/a-cumulative-merkle-distributor-for-airdrop-51f0a5b49d2c · https://metaplex.com/docs/hydra

## 13. Web3 music & memecoin precedents
**Bottom line:** Every project that made the **token the product** and tied value to
speculation **died or pivoted** (Royal, Sound.xyz→subscription, Opulous, OneOf). Survivors
(Catalog, Sound Premium, Bandcamp) treated blockchain as **invisible plumbing for fans, not
investors**. **No indexed 2026 competitor does the exact in-browser-create→coin→listens loop**
— lane open, but trivially cloneable.
- **Royal** ($71M, fractional royalties) shut down — speculators not fans, securities risk.
- **Audius** alive (250M+ on-chain streams) but AUDIO down ~95%; engagement rewards →
  vanity metrics, not durable artist economics.
- **Believe/$LAUNCHCOIN** (the direct analogue): ~$200M cap → **99.8% crash**, mutable
  metadata rug vector, founder arrested. **time.fun**: a *redemption/utility* model worth copying.
- **5 takeaways:** (1) blockchain as back-end, fandom as product; (2) lock metadata + vest
  creator; (3) build a utility sink; (4) make listens costly-to-fake & utility-linked, not
  raw emissions; (5) assume securities scrutiny — never promise profit from holding.
- Sources: https://www.chartlex.com/blog/business/music-nft-web3-post-mortem-2026 · https://decrypt.co/305649/audius-solana-airdrop-music-streams-250-million · https://decrypt.co/365292/founder-solana-token-launchpad-believe-arrested · https://www.theblock.co/post/343031/tokenized-time-platform-time-fun-goes-live-on-solana

## 14. Legal, regulatory & licensing
**Bottom line:** Biggest risk is **securities law** — a token paying holders income from
fees+listens ≈ an investment contract under Howey and the **March 2026 SEC/CFTC joint
release**. Pay **creators (labor)** not passive holders; frame rewards as non-promised;
CC0 asset base; geoblock; decentralize payouts; **get a securities opinion**. *(Not legal
advice.)* Full register: [04-legal-and-risk.md](../04-legal-and-risk.md).
- 2025 memecoin no-action comfort does **not** cover revenue-bearing tokens.
- "**Joint issuer**" theory in live SDNY pump.fun class actions — the *platform* is exposed.
- MSB/KYC if you custody payouts → **route on-chain/peer-to-protocol** to reduce exposure.
- DMCA §512(c) safe harbor: register a designated agent + repeat-infringer policy.
- AI tracks: prompts alone ≠ authorship (USCO) → hybrid engine for ownable output.
- Sources: https://www.sec.gov/newsroom/speeches-statements/staff-statement-meme-coins · https://www.morganlewis.com/pubs/2026/03/crypto-clarity-sec-and-cftc-issue-comprehensive-crypto-asset-guidance-part-1 · https://www.cryptopolitan.com/pump-fun-slammed-with-class-action-lawsuit/ · https://www.copyright.gov/512/

## 15. Product UX, onboarding & GTM
**Bottom line:** Ship on an **embedded-wallet** stack so signup = "log in with email/Google,
get a self-custodial wallet you never see." Recommended: **Privy** (auth + wallet, proven at
pump.fun scale, Stripe-owned → bundled on-ramp) + **Kora** gasless relayer. North star: make
"launch a coin" feel exactly like "post a song."
- Gasless: Kora fee-payer / sponsored tx; first-buyer-pays-creation (pump.fun pattern); on-ramp
  via Stripe (~1.5%) → Coinbase/MoonPay fallback.
- Flow: make → preview → name+ticker+auto-cover → one-tap launch → instant song-coin page →
  share card → others **listen (walletless)** → trade → creator earns/claims.
- Drop-off fixes: email/social signup, no "buy SOL first," auto-suggest name/ticker/cover,
  never show a seed phrase, pre-filled share card.
- Virality: shareable song-coin OG cards w/ embedded player, leaderboards (most-listened,
  top-earning, hot-now), share-to-earn referrals.
- **Name shortlist:** Loopcoin, Crackle, Sidechain, Hum, Lofify, Tape, Bedroom, Mellow,
  Cassette, Loft (`.fun`/`.fm` read best — verify availability).
- Sources: https://www.privy.io/pricing · https://privy.io/blog/token-creation-for-everyone-with-pump-fun · https://www.quicknode.com/guides/solana-development/transactions/kora · https://docs.phantom.com/embedded/embedded-web-sdk

---

*These are research notes, not gospel. Every $ figure, fee tier, and regulatory reading is
point-in-time (mid-2026) and should be re-verified at build/launch time.*
