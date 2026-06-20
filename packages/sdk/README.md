# @lofi/sdk

Core TypeScript SDK for lofi-solana — browser-made lofi songs launched as tradeable tokens.

Creators and holders earn from trading fees, weighted by verified on-chain listening activity.

---

## Modules

### `types.ts`

All shared interfaces. Key types:

| Type | Purpose |
|---|---|
| `SongMeta` | Track identity: title, ticker, BPM, key, duration, cover/audio URIs, creator |
| `LaunchParams` | Input to a launch provider |
| `LaunchResult` | Mint address, tx signature, token URL |
| `LaunchProvider` | Interface all launch adapters implement |
| `ListenHeartbeat` | Single ~10 s heartbeat from a browser |
| `QualifiedListen` | A heartbeat sequence that passed qualification |
| `RewardLeaf` | `{ claimant: string, amount: bigint }` — one Merkle leaf |
| `EpochPlan` | Full set of cumulative leaves for one distribution epoch |

---

### `config.ts`

- `PUMP_FUN_PROGRAM_ID` — Pump.fun AMM on-chain program ID (`6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`)
- `LOFI_REWARD_PROGRAM_ID` — lofi-solana distribution program (replace after deploy)
- `CLUSTER_CONFIGS` — RPC URLs for mainnet-beta / devnet / localnet
- `DEFAULT_DISTRIBUTION_PARAMS` — 40/30/30 creator/holder/listener split
- `DEFAULT_LISTEN_QUALIFY` — 30 s minimum, 0.5 completion ratio

---

### `metadata.ts`

```ts
buildSongMetadata(meta: SongMeta, externalUrl?: string): SongMetadata
```

Produces a Metaplex Token Metadata v1.1-compatible JSON object with audio extensions:

- `image` — cover art URI (shown as NFT thumbnail)
- `animation_url` — audio file URI (Metaplex convention for audio tokens)
- `attributes` — BPM, Key, Duration
- `properties.files` — both audio and cover with MIME types
- `category: "audio"` — recognised by Magic Eden, Tensor

Upload the serialised JSON to IPFS/Arweave and pass the CID URI to `LaunchParams.metadataUri`.

---

### `launch/`

#### `launch/pumpfun.ts` — `PumpPortalLaunchProvider`

Non-custodial (LOCAL API) token creation via PumpPortal.

```ts
const provider = new PumpPortalLaunchProvider();
const { serializedTx, mint } = await provider.buildCreateSongTokenTx(params);
// → hand serializedTx to the browser wallet adapter to sign + send
```

**Wire format** (POST `https://pumpportal.fun/api/trade-local`):

```json
{
  "publicKey":        "<creator wallet, base58>",
  "action":           "create",
  "tokenMetadata":    { "name": "…", "symbol": "…", "uri": "<ipfs://…>" },
  "mint":             "<fresh mint pubkey, base58>",
  "denominatedInSol": "true",
  "amount":           0.5,
  "slippage":         10,
  "priorityFee":      0.0005,
  "pool":             "pump"
}
```

Response: raw `ArrayBuffer` → base64-encoded `serializedTx`.

> **TODO**: replace with `@pump-fun/pump-sdk` `createAndBuyInstructions()` to build the tx locally and skip PumpPortal's ~0.5% fee. The `LaunchProvider` interface is identical.

#### `launch/meteora.ts` — `MeteoraDbcLaunchProvider`

Stub for the "own branded launchpad" path via [Meteora Dynamic Bonding Curve](https://docs.meteora.ag/dynamic-bonding-curve/overview). Custom curve shape, Jupiter routing, configurable graduation threshold. See `LofiBondingCurveConfig` and inline TODOs.

#### `launch/index.ts` — `getLaunchProvider`

Factory function:

```ts
const provider = getLaunchProvider("pumpfun", {});
const provider = getLaunchProvider("meteora", { curveConfig: DEFAULT_LOFI_CURVE_CONFIG });
```

---

### `listen/session.ts`

Server-side HMAC-SHA256 session tokens.

```ts
// On play-start (server):
const token = issueSession(
  { listenerId, trackId, exp: now + 3600, ip: req.ip },
  process.env.SESSION_SECRET,
);

// On each heartbeat (server):
const result = verifySession(token, process.env.SESSION_SECRET);
if (!result.valid) throw new Error(result.reason);
```

Token format: `base64url(payloadJSON).base64url(hmac-sha256)` — self-contained, stateless.

---

### `listen/qualify.ts`

Qualification logic for listen sessions.

```ts
// Single session:
const { qualified, qualifiedListen } = qualifyListen(heartbeats, {
  minSeconds: 30,
  minCompletion: 0.5,
  durationSec: 185,
});

// Batch (groups by session, deduplicates by listenKey):
const qualified = qualifyBatch(allHeartbeats, config);

// Dedup key:
const key = listenKey(trackId, listenerId, windowStart);
```

**Economic hardening** baked into the comments:

1. Min-seconds gate — rejects skip-farm patterns
2. Min-completion gate — scales requirement with track length
3. Per-wallet daily cap — applied in `distribution.ts`
4. Hold-to-earn gate — applied in `distribution.ts`
5. Fixed pool — more farmers = thinner slices
6. Dedup window — 10-min window prevents replaying heartbeats

---

### `listen/client.ts`

Browser `ListenReporter` — manages the heartbeat loop.

```ts
const reporter = new ListenReporter({
  listenerId:   wallet.publicKey.toBase58(),
  trackId:      mintAddress,
  sessionToken: tokenFromServer,
  durationSec:  track.durationSec,
  audioEl:      document.querySelector("audio")!,
});

reporter.start();   // fires POST /api/listens every 10 s
reporter.stop();    // cleans up interval + event listeners
```

Uses `navigator.sendBeacon` on `pagehide`/`visibilitychange` to flush a final heartbeat without blocking navigation.

---

### `rewards/merkle.ts`

#### Byte format (on-chain contract)

```
Leaf  = keccak256( [0x00] || pubkey_bytes(32) || u64_le(amount)(8) )
Node  = keccak256( [0x01] || min(a,b)(32)     || max(a,b)(32)     )
```

- `0x00` / `0x01` prefixes prevent second-preimage attacks.
- Sibling pairs are **sorted** (min first), so proofs don't encode left/right direction.
- `u64_le` — 8-byte little-endian (Solana/Anchor standard).
- Amounts are **cumulative** across epochs.

**If the on-chain program changes the leaf format, update `hashLeaf` and `hashNode` here.**

```ts
const tree  = buildTree(leaves);
const root  = tree.getRoot();          // Uint8Array(32)
const proof = tree.getProof(claimant); // Uint8Array[]

const ok = verify(root, claimant, amount, proof); // true
```

---

### `rewards/distribution.ts`

```ts
const plan = computeEpochPlan({
  epochId:    "2025-W03",
  songMint:   mintAddress,
  creatorWallet,
  feePoolLamports: 5_000_000_000n,  // 5 SOL
  holders,
  qualifiedListensByWallet,
  params: DEFAULT_DISTRIBUTION_PARAMS,
  previousCumulative,               // Map<wallet, bigint>
});

// Next epoch:
const nextCumulative = toCumulativeMap(plan);
```

Distribution flow:

```
feePool
  ├── creator  (creatorBps / 10 000)  → fixed to creatorWallet
  ├── holders  (holderBps / 10 000)   → pro-rata by token balance
  └── listeners (listenerBps / 10 000) → pro-rata by capped qualified listens
                                          (only wallets with ≥ minHoldForListenerReward)
```

---

## Merkle Tree Invariants (keep in sync with on-chain program)

| Field | Value |
|---|---|
| Hash function | keccak256 (`@noble/hashes/sha3`) |
| Leaf prefix | `0x00` |
| Node prefix | `0x01` |
| Public key encoding | base58 → 32-byte big-endian |
| Amount encoding | u64 little-endian, 8 bytes |
| Node pair ordering | sorted min(a,b) \|\| max(a,b) |
| Odd-node promotion | carry up unchanged (no extra hash) |
| Amount semantics | **cumulative** across epochs |

Any change to this table requires a coordinated update of **both** this SDK and the on-chain program. Changing only one will cause all proofs to be rejected.

---

## Distribution Model Summary

| Group | Share | Eligibility |
|---|---|---|
| Creator | 40% (default) | Always; single wallet |
| Holders | 30% (default) | Hold ≥ 1 token unit at snapshot |
| Listeners | 30% (default) | ≥ 1 qualified listen **and** ≥ minHoldForListenerReward tokens |

Listener rewards are pro-rata from a fixed pool, per-wallet capped at `listenerDailyCapPerWallet` listens per epoch. This means farming more listens beyond the cap earns nothing, and a higher total listen count dilutes everyone's per-listen share — making systematic farming economically irrational.
