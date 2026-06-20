/**
 * POST /api/listens
 * Heartbeat endpoint for listen tracking.
 *
 * Receives periodic pings from the client Player component.
 * Validates session, deduplicates, and determines if the listen qualifies.
 *
 * Request body:
 *   { trackId, positionSeconds, durationSeconds, sessionToken }
 *
 * Response:
 *   { qualified: boolean, listenId?: string }
 *
 * TODO: Replace in-memory dedup map with Redis / Solana account storage.
 * TODO: Verify HMAC sessionToken (sign with server secret on session start).
 * TODO: Anchor instruction to increment on-chain listen counter after qualification.
 */

import { NextResponse } from "next/server";

interface HeartbeatBody {
  trackId: string;
  positionSeconds: number;
  durationSeconds: number;
  sessionToken: string;
}

// In-memory dedup: sessionToken → { ticks, qualified, firstTick, cumulativeSeconds }
// NOTE: This resets on server restart and doesn't scale horizontally.
// Replace with Redis or a DB-backed solution in production.
const sessions = new Map<
  string,
  {
    trackId: string;
    ticks: number;
    qualified: boolean;
    cumulativeSeconds: number;
    firstTick: number;
  }
>();

const HEARTBEAT_INTERVAL_S = 10; // expected client interval
const QUALIFY_SECONDS = 30;

export async function POST(request: Request) {
  let body: HeartbeatBody;

  try {
    body = (await request.json()) as HeartbeatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { trackId, positionSeconds, durationSeconds, sessionToken } = body;

  if (!trackId || !sessionToken) {
    return NextResponse.json(
      { error: "trackId and sessionToken are required" },
      { status: 400 }
    );
  }

  // TODO: Verify HMAC(sessionToken, serverSecret) to prevent spoofing
  // const valid = verifySessionHMAC(sessionToken, process.env.SESSION_SECRET!);
  // if (!valid) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  // Get or create session record
  const key = `${trackId}:${sessionToken}`;
  let session = sessions.get(key);

  if (!session) {
    session = {
      trackId,
      ticks: 0,
      qualified: false,
      cumulativeSeconds: 0,
      firstTick: Date.now(),
    };
    sessions.set(key, session);
  }

  // If already qualified, return immediately (idempotent)
  if (session.qualified) {
    return NextResponse.json({ qualified: true });
  }

  // Accumulate listen time (each heartbeat = ~10 s of actual playback)
  session.ticks += 1;
  session.cumulativeSeconds = session.ticks * HEARTBEAT_INTERVAL_S;

  // Qualification conditions (server mirrors client-side checks)
  const meetsTime     = session.cumulativeSeconds >= QUALIFY_SECONDS;
  const meetsPosition =
    durationSeconds > 0 && positionSeconds / durationSeconds >= 0.5;

  if (meetsTime && meetsPosition) {
    session.qualified = true;

    // TODO: Anchor instruction — increment on-chain listen count for trackId
    // await incrementOnChainListenCount(trackId);
    //
    // TODO: Enqueue listen record for Merkle tree snapshot at epoch boundary
    // await enqueueListenForEpoch({ trackId, sessionToken, timestamp: Date.now() });

    return NextResponse.json({
      qualified: true,
      listenId: `${trackId}:${sessionToken}:${Date.now()}`,
    });
  }

  return NextResponse.json({ qualified: false });
}
