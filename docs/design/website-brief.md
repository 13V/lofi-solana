# Website Design Brief — research & rationale

The "best format & layout" research behind [`claude-website-prompt.md`](claude-website-prompt.md).
Distilled from a design-research fan-out (Awwwards/WebGL exemplars, lofi art direction,
crypto-dark-UI patterns, and pump.fun/bonk teardowns). Use this to understand *why*; use the
prompt to *build*.

## Positioning: calm-premium, not arcade-chaos
pump.fun is deliberately a "4chan-catalog arcade" — dense cards, a bouncing-on-buy effect, a
"Now Trending" ticker, mint-green (#55d292) chaos. bonk.fun is a cleaner Raydium skin (yellow
#FFE208 / orange #FC8E03, Poppins + Space Mono). **Our wedge is the opposite end:** warm,
lived-in, hand-art-directed, unhurried — a *place* (a bedroom studio at golden hour), not a
trading terminal. We borrow their **live energy** (real-time tickers, leaderboards) but wrap
it in warmth and restraint. That contrast is the brand.

## Recommended landing anatomy (section order + the "wow")
1. **Nav** — glassy, thin; waveform wordmark + tiny live mono ticker + magnetic "Enter Studio".
2. **Hero** — interactive, audio-reactive, *playable* (tap a step-grid, hear lofi). The wow.
3. **Live marquee** — infinite-scroll band of live song-coins (spinning-vinyl chips). "Alive."
4. **How it works** — horizontally-pinned scroll-telling: Make → Coin → Earn.
5. **Studio showcase** — bento/parallax of the real studio UI; "Try it."
6. **Earnings** — animated "listens → fees → you" money-loop; compliance-safe copy.
7. **Live leaderboard** — Top Earning / Most Listened, sparklines, live shimmer. FOMO + proof.
8. **Numbers / proof** — kinetic stat counters + creator quotes.
9. **FAQ** — disarming + honest ("Is this an investment? No.").
10. **Final CTA** — full-bleed golden-hour; email/wallet capture.
11. **Footer** — waveform mark, sitemap, socials, "rewards, not an investment" line.

## Art direction
**The lofi "two poles" — calibrate, don't collage.** Warm analog nostalgia (cassette, vinyl,
amber lamp) × cool anime introspection (indigo city-at-night, lilac). Premium lofi = one
strong motif + narrative specificity (one desk, one lamp, one window). Tacky lofi = sticker
soup. **Hero & CTAs run warm; feature/data sections may cool toward dusk.**

**Palettes (hex):**
- *Bedroom Amber* (hero/warm): base `#1C1410` · warm-mid `#6E4B3F` · gold `#D4943A` ·
  parchment `#E4CBA8` · caramel `#A57F5B`.
- *Dusk Study* (feature/cool): base `#14101E` · indigo `#2E2445` · lilac `#B7A9C6` · dusty
  rose `#D6B2C2`.
- *Project tokens* (in the prompt): ink `#140E1A`, cream `#F4ECE2`, dusk-violet `#9075D8`,
  gold `#F2B66B`, golden-hour gradient peach→rose→plum, vu-mint `#6FE0C2` (live data only).

**Grain/texture (the #1 lofi signal — RESTRAINT: one technique, not a VHS+scanline+halftone stack):**
- CSS: inline-SVG `feTurbulence baseFrequency='0.65' numOctaves='3'` + `mix-blend-mode:
  soft-light` + `opacity:0.35–0.45` on a fixed `::before`.
- Hero WebGL: `snoise3D` + `blendSoftLight`, **midtones only** (`smoothstep(0.05,0.5,luma)`)
  → photo grain, not TV static.
- Waveform/spectrum: **8×8 Bayer dithering** (color pair ink/gold) for a printed-label look.
- Subtle scanlines/vignette on dark panels; soft bloom on lights.

**Type:** Display **Fraunces** (variable, soft, cozy-editorial serif) · Body **General Sans**
/ **Geist** (clean grotesk) · Data/labels **Space Mono** (also what BONK uses for UI — the
cassette-label + ticker voice). Serif headlines + mono labels = the signature pairing. Big
type; tabular/mono numbers for all prices and listens.

**Signature motif to OWN — the coin-as-vinyl.** A Solana song-coin rendered as a spinning
vinyl record: concentric SVG groove rings, dark center label (cover art), warm graphite→gold
edge glow, amber light from upper-left (desk-lamp direction), Bayer-dithered groove texture.
It "fills" inward from the edge as earnings/listens accrue — fusing music + crypto into one
non-clichéd mark that scales from 16px favicon to full-bleed hero. (Two independent research
agents converged on this — it's the one.)

## Live + trust modules (borrow the energy, keep it warm)
- **Live data done tastefully:** WebSocket tickers; numbers that **ease**, not hard-jump;
  green/red **flash-then-settle** on price change; **skeleton loaders**. (pump.fun's
  bounce-on-buy is the loud version; ours is the calm version.)
- **Trust signals at decision points** (not buried in footer): specific numbers *with
  timestamps* ("47,312 listeners this week"), verified-creator ticks, Solscan links on every
  launch, transparent fees.
- **Anti-trust / avoid:** auto-popping "Connect Wallet" on load, FOMO countdown timers,
  glitch type + abstract floating 3D blobs (now strongly "rug-pull-coded"). These also
  conflict with our "not an investment" legal posture — so they're out on two counts.

## Motion stack (2026)
- **Lenis** smooth scroll, driven by **GSAP's ticker** (run ScrollTrigger off Lenis or
  positions jitter — the known gotcha).
- **GSAP ScrollTrigger** (pinned how-it-works, clip/mask reveals, parallax) + **SplitText**
  (kinetic headline).
- **React Three Fiber + drei** for the hero audio-reactive field only; lazy-load,
  `dynamic(..., { ssr:false })`.
- Easing: soft, weighty, analog — *except* live data, which ticks crisply.

## Performance & accessibility (hard gates)
- `prefers-reduced-motion` kills parallax/WebGL/auto-audio; keep the static beauty.
- **Audio off until a user gesture**; always-visible mute/play; never autoplay sound.
- Lazy-load WebGL/below-the-fold; hero LCP text must not wait on WebGL; protect LCP/INP.
- Keyboard nav, visible focus, AA contrast for body, alt text, mobile fallback for every
  heavy effect.

## Premium vs. tacky (the line)
| Premium | Tacky |
|---|---|
| One grain technique, done well | Three effects fighting |
| Warm-dark limited palette + one accent | Full rainbow at equal weight |
| Narrative specificity (one room) | Sticker-soup symbol collage |
| Grain in midtones only | Uniform grain over everything |
| Vinyl/cassette as structural metaphor | Cassette clipart as decoration |
| Live data that informs | Looping decorative animation everywhere |

## Reference touchstones
- Awwwards **Music Interfaces** & **Sound Design** collections; **OHZI Interactive** (WebGL
  cursor/GLSL); **"Throwbacks Music"** interactive experience.
- **Ableton Learning Synths** (playable audio UI), **Teenage Engineering** (tactile warmth),
  **Braun/Dieter Rams** (premium turntable geometry), **LoFi Girl** (one-scene restraint),
  the **Tapedeck** archive (cassette J-card typography).
- **pump.fun / bonk.fun** for live-launch energy — but warmer, calmer, premium.
- Texture how-tos: CSS-Tricks "Grainy Gradients"; Codrops Bayer-dithering & ASCII/dither
  shader guides; Maxim McNair "WebGL Film Grain".

→ Build from [`claude-website-prompt.md`](claude-website-prompt.md).
