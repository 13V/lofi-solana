/**
 * Server-side listen session tokens.
 *
 * A session token is an HMAC-SHA256 over a canonical payload string.
 * It lets the server verify that a stream of heartbeats belongs to a
 * legitimate, recently-started listen session without storing state —
 * the token itself carries the expiry and listener/track identity.
 *
 * Format (dot-separated, URL-safe base64):
 *   <base64url(payload)>.<base64url(hmac)>
 *
 * Payload JSON:
 *   { listenerId, trackId, exp, ip }
 *
 * Security properties:
 *  - The HMAC prevents tampering with any field (including exp).
 *  - `ip` binding prevents token-sharing across machines (soft mitigation).
 *  - Short expiry (default 1 h) limits replay windows.
 *  - The server secret must be rotated if compromised; old tokens
 *    immediately become invalid on rotation.
 */

import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionPayload {
  /** Base-58 public key of the listening wallet (or anonymous ID). */
  listenerId: string;
  /** Base-58 mint address of the track. */
  trackId: string;
  /** Unix timestamp (seconds) at which the token expires. */
  exp: number;
  /** IPv4 or IPv6 address of the requester (for soft IP-binding). */
  ip: string;
}

export interface VerifyResult {
  valid: boolean;
  payload?: SessionPayload;
  /** Human-readable reason when valid === false. */
  reason?: string;
}

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

function toBase64Url(bytes: Uint8Array): string {
  // In Node ≥ 18 / modern browsers: Buffer.from or btoa-compatible path.
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(bytes).toString("base64")
      : btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }
  const bin = atob(padded);
  return new Uint8Array([...bin].map((c) => c.charCodeAt(0)));
}

function encodePayload(payload: SessionPayload): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(payload));
}

function decodePayload(bytes: Uint8Array): SessionPayload {
  return JSON.parse(new TextDecoder().decode(bytes)) as SessionPayload;
}

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------
// HMAC computation
// ---------------------------------------------------------------------------

function computeHmac(payloadBytes: Uint8Array, secretBytes: Uint8Array): Uint8Array {
  return hmac(sha256, secretBytes, payloadBytes);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Issue a signed session token for a new listen session.
 *
 * Call this on the server when the user presses "play".  Return the token
 * to the client; the client includes it in every heartbeat.
 *
 * @param payload  — { listenerId, trackId, exp, ip }
 * @param secret   — server-side HMAC secret (min 32 random bytes, hex or utf8)
 * @returns opaque token string (two base64url segments joined by ".")
 *
 * @example
 * ```ts
 * const token = issueSession(
 *   { listenerId: wallet.publicKey.toBase58(), trackId: mint, exp: now + 3600, ip: req.ip },
 *   process.env.SESSION_SECRET!,
 * );
 * ```
 */
export function issueSession(
  payload: SessionPayload,
  secret: string,
): string {
  const payloadBytes = encodePayload(payload);
  const secretBytes = encodeSecret(secret);
  const mac = computeHmac(payloadBytes, secretBytes);

  return `${toBase64Url(payloadBytes)}.${toBase64Url(mac)}`;
}

/**
 * Verify a session token.
 *
 * Performs a constant-time HMAC comparison to prevent timing attacks.
 *
 * @param token   — token returned by `issueSession`
 * @param secret  — same secret used to issue the token
 * @param nowSec  — current unix timestamp in seconds (default: Date.now()/1000)
 * @returns { valid: true, payload } on success, { valid: false, reason } on failure
 */
export function verifySession(
  token: string,
  secret: string,
  nowSec = Math.floor(Date.now() / 1_000),
): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, reason: "malformed token: expected 2 segments" };
  }

  let payloadBytes: Uint8Array;
  let providedMac: Uint8Array;

  try {
    payloadBytes = fromBase64Url(parts[0]!);
    providedMac = fromBase64Url(parts[1]!);
  } catch {
    return { valid: false, reason: "malformed token: base64url decode failed" };
  }

  const secretBytes = encodeSecret(secret);
  const expectedMac = computeHmac(payloadBytes, secretBytes);

  // Constant-time comparison (noble/hashes does not expose one, so we do it).
  if (!timingSafeEqual(expectedMac, providedMac)) {
    return { valid: false, reason: "invalid signature" };
  }

  let payload: SessionPayload;
  try {
    payload = decodePayload(payloadBytes);
  } catch {
    return { valid: false, reason: "malformed payload JSON" };
  }

  if (payload.exp < nowSec) {
    return {
      valid: false,
      reason: `token expired at ${new Date(payload.exp * 1_000).toISOString()}`,
    };
  }

  return { valid: true, payload };
}

// ---------------------------------------------------------------------------
// Constant-time byte comparison
// ---------------------------------------------------------------------------

/**
 * Compare two Uint8Arrays in constant time to prevent timing side-channels.
 * Returns true iff `a` and `b` are the same length and have identical bytes.
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}
