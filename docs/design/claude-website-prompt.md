# lofi-solana — Master Website Design Prompt

The deliverable: a single, copy-pasteable prompt that makes Claude (or any top coding
agent) build an **award-worthy** marketing site for lofi-solana.

## How to use it
- **Mode A — build in this repo (recommended):** paste the prompt below into Claude Code
  / claude.ai with the repo open. It targets our Next.js 15 + Tailwind v4 stack.
- **Mode B — one-shot artifact:** paste into claude.ai and ask for a single self-contained
  React component. The prompt tells Claude how to degrade gracefully (canvas instead of
  WebGL, etc.).

Everything between the `=== PROMPT START/END ===` markers is the prompt. Tweak the palette
hex, headlines, or section list to taste before sending.

---

=== PROMPT START ===

**ROLE.** You are a world-class creative developer and art director — Awwwards "Site of the
Day" caliber. Design AND build the marketing website for **lofi-solana**. This is not a
generic SaaS page. Make something people screenshot and share.

**PRODUCT (one breath).** lofi-solana is a browser studio where anyone makes an original
lofi track in minutes, launches it as a tradeable token on Solana (pump.fun), and earns
from trading fees — boosted by how much the song gets listened to. "pump.fun for songs you
actually make."

**NORTH-STAR CONCEPT — "The Bedroom Studio at Golden Hour."** Warm dusk light, vinyl +
cassette tactility, film grain and tape warmth — fused with the live, ticking energy of an
on-chain market. Cozy analog × living digital; that tension IS the brand. Every screen
should feel hand-made and warm, yet alive with real-time motion. It should feel like a
*place*, not a pitch.

**AUDIENCE & VOICE.** Bedroom producers, lofi/study-beats fans, and curious crypto-natives.
Voice = warm, playful, a little dreamy, quietly confident. Never hype-y, never scammy.
Teenage Engineering meets a Sunday-night lofi stream.

**ART DIRECTION (commit fully — half-measures read as "template").**
- Palette (define as CSS variables):
  `--ink:#140E1A` (warm near-black bg) · `--panel:#1B1422` · `--cream:#F4ECE2` (text) ·
  `--muted:#B9AEC4` · `--dusk-violet:#9075D8` · `--magenta:#A348A6` · `--plum:#6B4AB3` ·
  `--gold:#F2B66B` (primary accent / CTAs) · `--rose:#E08FB0` · `--peach:#F7C6A7` ·
  `--vu-mint:#6FE0C2` (live-data accent only).
  Signature "golden-hour" gradient = peach→rose→plum (`#F7C6A7 → #E08FB0 → #6B4AB3`); use
  sparingly for hero glow and the final CTA.
  Palette zoning (the lofi "two poles"): hero & CTAs run **WARM** (amber/gold/peach —
  desk-lamp-at-night); feature/data sections may cool toward **DUSK** (indigo/lilac —
  anime-study-window). Optional warmer-hero alt set: `--ink:#1C1410 · --warm-mid:#6E4B3F ·
  --gold:#D4943A · --parchment:#E4CBA8`.
- Type: **Fraunces** (variable, soft, high-contrast serif — cozy editorial) for huge
  headlines; **General Sans** or **Geist** (clean grotesk) for body; **Space Mono** for
  tickers, prices, tape-labels, and all data. Big type. Serif headline + mono labels = the
  signature voice. Load from Google Fonts / Fontshare.
- Texture (the #1 lofi signal — but RESTRAINT: one grain technique done well, NEVER a stack
  of VHS + scanline + chromatic + halftone at once):
  - Film grain overlay via inline-SVG `feTurbulence baseFrequency='0.65' numOctaves='3'` +
    `mix-blend-mode:soft-light` + `opacity:0.35–0.45` on a fixed `::before`. For the hero,
    prefer a WebGL grain (`snoise3D` + `blendSoftLight`, **midtones only** via
    `smoothstep(0.05,0.5,luma)`) so highlights/shadows stay clean (photo grain, not TV static).
  - Optional **Bayer (8×8) dithering** on the audio waveform/spectrum for a printed-
    record-label look (color pair `--ink` / `--gold`).
  - Faint **scanlines/vignette** on dark panels (subtle — invisible at arm's length); soft
    **bloom** on lights; **vinyl groove rings**; **tape-label** stickers; worn-plastic card
    shadows. Narrative specificity (one desk, one lamp, one window) beats sticker-soup.
- Signature motifs to OWN: (1) the **"waveform horizon"** — a golden-hour sun/horizon line
  drawn as an audio waveform; use it as the wordmark and as section dividers. (2) **a
  song-coin = a spinning vinyl record** with a thin price ring around it.

**LAYOUT — section by section. Each MUST land one clear "wow."**
1. **Nav** (thin, glassy): waveform-horizon wordmark + a tiny live mono ticker
   ("◉ 1,294 songs launched today") + magnetic gold "Enter Studio".
2. **Hero** — the signature interactive, audio-reactive moment (full spec below).
3. **Live marquee** — an infinite-scroll band of live song-coins as small spinning-vinyl
   chips: cover · `$TICKER` · price · ▲listens, in Space Mono. Two rows, opposite
   directions, slight skew. *Wow: the page is alive.*
4. **How it works** — a horizontally-pinned scroll-telling sequence (GSAP ScrollTrigger
   pin): three panels **Make → Coin → Earn**, each with an animated mini-visual (a step-grid
   lighting up → a token minting onto a vinyl → an earnings counter ticking up with
   listens). *Wow: the product told as a cinematic horizontal journey.*
5. **Studio showcase** — a bento/parallax of the real studio UI (cozy mockups: pads, knobs,
   the lofi FX rack); "Try the studio" CTA. *Wow: tactile, real, "I want to touch that."*
6. **Earnings** — "listens → fees → you": animate coins flowing along a curved path that
   visibly pulses faster as a listens counter rises. Compliance-safe copy. *Wow: you SEE the
   money loop.*
7. **Live leaderboard** — "This week" tabs: Top Earning / Most Listened. Rows with a
   spinning-vinyl avatar, `$ticker`, a sparkline, listens, earnings — all mono, with a subtle
   live-data shimmer. *Wow: FOMO + credibility.*
8. **Numbers / proof** — huge kinetic stat counters (paid to creators · songs launched ·
   total listens) + 2–3 creator quotes.
9. **FAQ** — honest and disarming: "Is this an investment? No." · how listens are counted ·
   CC0/ownership · fees.
10. **Final CTA** — full-bleed golden-hour scene with the waveform horizon and a giant
    headline; email/wallet capture; gold button.
11. **Footer** — waveform-horizon mark, sitemap, socials, mono legal line + the
    "rewards, not an investment" disclaimer.

**SIGNATURE HERO SPEC (make-or-break).**
- Full viewport. Background = an audio-reactive WebGL field (React Three Fiber): a warm,
  grainy gradient haze + a flowing waveform ribbon / particle bloom that pulses to the music
  via Web Audio `AnalyserNode` (`getByteFrequencyData`). Golden-hour palette.
- Foreground: a slowly spinning vinyl/cassette and a **playable step-sequencer** (≈ 2–3 rows
  × 8 steps: hats / keys / kick). Tapping a step toggles it AND you hear it (Tone.js or raw
  Web Audio). Gesture-gated: show "▶ tap to start the beat" on first interaction (autoplay
  policy). The grain + bloom subtly intensify on each beat.
- Kinetic headline via GSAP SplitText (e.g. "Make the sound of **now.**") + subhead + a gold
  "Make your first beat" CTA.
- Reduced-motion / mobile fallback: a pre-rendered looping golden-hour gradient + tap-to-play
  button; no heavy WebGL.

**MOTION & INTERACTION LANGUAGE.**
- **Lenis** smooth scroll, driven by **GSAP's ticker** (run ScrollTrigger off Lenis so
  positions don't jitter — this is the known gotcha).
- **GSAP ScrollTrigger**: the pinned How-It-Works, clip/mask reveals (not just fades),
  layered parallax.
- **R3F** only for the hero (+ optional subtle bg), lazy-loaded.
- Micro-interactions: magnetic buttons, cursor-aware glow, vinyl spins faster on hover,
  tape-label tooltips, number tickers, marquees.
- Easing = soft and weighty (custom cubic-beziers); nothing snappy/corporate. Everything
  feels analog and unhurried — *except* the live data, which ticks crisply.

**TECH & CONSTRAINTS.**
- **Mode A (preferred):** Next.js 15 App Router + React 19 + TypeScript + Tailwind CSS v4.
  Libs: `gsap` (ScrollTrigger, SplitText), `lenis`, `@react-three/fiber` + `@react-three/drei`
  + `three`, and `tone` (or raw Web Audio) for the hero. Use `"use client"` on interactive
  sections; dynamic-import R3F with `ssr:false`. Structure as composable section components
  (`components/marketing/*`) consumed by a marketing route. Palette via CSS vars.
- **Mode B (single artifact):** output ONE self-contained React component; degrade the hero
  to a `<canvas>`/CSS audio-reactive effect; keep the same art direction, copy, and sections.

**PERFORMANCE & ACCESSIBILITY (hard requirements).**
- Respect `prefers-reduced-motion` (kill parallax/WebGL/auto-audio; keep the static beauty).
- Audio OFF until a user gesture; always-visible mute/play; never autoplay sound.
- Lazy-load WebGL & below-the-fold; the hero LCP text must not wait on WebGL; protect
  LCP/INP.
- Keyboard navigable, visible focus states, AA contrast for body text, alt text on imagery.
- Every heavy effect has a mobile-first fallback.

**TRUST, NOT DARK PATTERNS (this builds credibility AND keeps us compliant).** No
auto-popping "Connect Wallet" on load; no FOMO countdown timers or manufactured urgency; no
glitchy, "rug-pull-coded" abstract-3D-blob clichés. DO show: specific live numbers with
timestamps ("47,312 listeners this week"), verified-creator ticks, Solscan links on every
launch, transparent fees, and tasteful live-data motion (skeleton loaders; green/red price
**flash-then-settle**; numbers that ease, not hard-jump). Restraint reads as maturity;
maturity reads as trust.

**COPY DECK (use this — do not lorem).**
- H1 options: "Make the sound of now." / "Your bedroom is the label now." / "Press record.
  Then press launch."
- Hero sub: "Make a lofi beat in your browser, drop it as a coin on Solana, and earn every
  time the world hits play."
- Steps — Make: "Tap out a beat. We keep it in key." · Coin: "Launch it as a token in one
  tap. No label, no gatekeepers." · Earn: "Trading fees flow back to you, boosted by every
  real listen."
- Earnings: "The more people listen, the more the people behind a song earn — funded by
  trading fees, paid out on-chain."
- Compliance line (FAQ + footer): "lofi-solana is a creative tool, not an investment
  platform. Coins are for fun and community; rewards are never guaranteed and are not
  financial returns."
- CTAs: "Make a beat" / "Enter the studio" / "Get paid to vibe."

**REFERENCE TOUCHSTONES (for vibe — do not copy).** Awwwards *Music Interfaces* & *Sound
Design* collections; OHZI Interactive (WebGL cursor/GLSL craft); the "Throwbacks Music"
interactive experience; Ableton *Learning Synths* (playable audio UI); Teenage Engineering
(tactile warmth); pump.fun (live-launch energy) — but warmer, calmer, premium, never
meme-cheap.

**ANTI-PATTERNS (avoid).** Generic dark-SaaS gradient + soulless glassmorphism; neon-on-black
"crypto-bro" clichés; stocky floating 3D blobs; sticker-soup lofi clichés; anything that
looks like a template. If it could belong to any startup, it's wrong.

**DONE WHEN.** The hero is genuinely interactive + audio-reactive (or a tasteful degraded
version); all sections exist with their wow moments and the real copy; grain + golden-hour
warmth + a living ticker run throughout; motion is smooth (Lenis+GSAP synced) and
reduced-motion/mobile safe; and it feels like a place you'd want to stay and make a beat.

Build it. Be bold. Show me something that makes me want to make a song right now.

=== PROMPT END ===

---

## Tuning knobs (edit before sending)
- **Less crypto, more cozy?** Drop `--vu-mint`, soften the leaderboard, lead harder on the
  studio.
- **More "insane"?** Add a cursor-trailing vinyl, a WebGL transition between sections, or a
  full-screen "now playing" radio mode.
- **Brand:** swap "lofi-solana" for the chosen name (Loopcoin / Crackle / Hum …) and update
  the wordmark line.
- Pair this with [`website-brief.md`](website-brief.md) for the research rationale behind
  every choice.
