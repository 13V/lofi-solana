# Legal & Risk Register

> ⚠️ **Not legal advice.** This is a founder-level risk map to take to qualified
> **securities**, **IP**, and **fintech/AML** counsel *before any mainnet launch*.
> Tokenizing songs that pay out revenue is genuinely legally loaded. Date: 2026-06-20.

## The one thing that reshapes the whole design

A song-token that pays **passive holders** ongoing income from trading fees + listens
lines up squarely with an **investment contract under Howey**, and with the **March 2026
SEC/CFTC joint interpretive release** (tokens conveying "rights to future income, profits,
or assets" or "passive yield" likely *are* securities). The 2025 memecoin no-action
comfort does **not** cover us — that rested on tokens having *no* economic rights. This is
the exact trap that killed **Royal** and **Opulous**.

**Design response (threaded through [tokenomics](02-tokenomics.md)):**
- Pay the **creator** (active labor → contractor/royalty income), not passive holders.
- Treat any listener/holder rewards as **discretionary, capped loyalty rewards** tied to
  the *act of listening*, never promised, never marketed as ROI/yield.
- Keep the token's pitched value **collectible + utility/access**, like a pump.fun coin.
- **Recommended v1: creator-only payouts.** Add the listener pool only after counsel +
  anti-bot are proven.

## Risk register

| # | Risk | Sev | Mitigation |
|---|---|---|---|
| 1 | **Securities / Howey** — passive-yield token = investment contract | 🔴 High | Pay creators (labor) not holders; no profit messaging; rewards discretionary; collectible/utility framing; **get a securities opinion**; consider creator-only v1 |
| 2 | **"Joint issuer" / facilitator liability** — as the *platform* enabling token creation you sit where pump.fun sits (live SDNY class actions allege "joint issuer") | 🔴 High | Stay a **neutral tool**: don't curate/select/promote individual coins; strong ToS shifting responsibility to users; D&O; counsel on operating-entity structure |
| 3 | **Money transmission / KYC-AML** — if *we* custody & distribute revenue we may be an MSB (FinCEN + state MTLs) | 🟠 Med | Route value **on-chain / peer-to-protocol** so we never take custody (strongest reducer); optional KYC for large cumulative payouts; AML program if any custody |
| 4 | **Sanctions / geofencing** — OFAC strict liability | 🟠 Med | Geoblock sanctioned jurisdictions (+ UK, which pressured pump.fun); restrict/scrutinize US persons until securities opinion clears; ToS attestation (VPN bypass is a known gap) |
| 5 | **Copyright / sampling / DMCA** — user uploads may embed uncleared samples | 🟠 Med | **CC0/owned-rights asset base only** (warranted in ToS); preserve DMCA §512(c) safe harbor: register a designated agent, notice-and-takedown, **repeat-infringer termination** |
| 6 | **AI-music copyrightability** — pure prompt-to-song output isn't copyrightable (USCO, Jan 2025) → can't be legitimately "owned"/sold | 🟡 Low-Med | **Hybrid engine** with logged human authorship (arrangement/edits/mix); don't represent AI tracks as fully copyrighted |
| 7 | **Bot-farmed listens** — fraud against the reward pool | 🟠 Med | [proof-of-listen](03-proof-of-listen.md): attestation + economic dampers (cap, hold-to-earn, fixed-pool, decay) |
| 8 | **Rug / pump-and-dump reputation** — category-wide (Believe → 99.8%) | 🟠 Med | Lock metadata at launch, vest creator, no holder-wipe migrations, utility sink |
| 9 | **EU MiCA** — revenue-bearing token may be a "financial instrument"/need CASP authorization | 🟡 Low | Don't actively offer into EU pre-authorization; geoblock or restrict to non-revenue features |
| 10 | **pump.fun dependency** — they can change fees, reassign `coin_creator` (admin), or alter rails | 🟡 Low-Med | Abstract behind `LaunchProvider`; keep Meteora-DBC alternative warm; model declining/fluid fee tiers |

## Practical compliance posture for a beta
- CC0-only instruments/samples (see [samples-licensing](research/findings.md#7-royalty-free-samples--licensing)); warrant rights in ToS.
- Non-custodial everything: users sign their own launches; payouts are on-chain claims.
- Clear, repeated **"rewards, not an investment; no promise of profit"** language.
- Geoblock + jurisdiction gating; DMCA agent registered; designated AML contact.
- Distance the brand from the "tokenized creators" (Believe) playbook.

## Open questions for counsel
- Does paying **creators** (not holders) escape Howey if creators also hold the token?
- Is the **listener-reward pool** "passive yield," or does requiring the *act of listening*
  + caps make it a defensible loyalty reward?
- Does pump.fun's bonding-curve custody shield us, or does operating the **front-end**
  re-attach "joint issuer" liability? (SDNY cases unresolved — materially affects structure.)
- State-by-state MTL footprint; does non-custodial routing fully avoid MSB status?
- The March 2026 release is **interpretive guidance, not statute** — durability depends on
  pending market-structure legislation.

Sources: [research: legal & regulatory](research/findings.md#14-legal-regulatory--licensing).
