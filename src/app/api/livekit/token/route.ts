import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from '@/lib/livekitServer';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { sanitizeText } from '@/security/sanitize';

export const POST = withZeroTrustGate(
  {
    scope: 'livekit_token',
    limit: 30,
    windowMs: 60 * 1000,
    requireAuth: 'authenticated',
  },
  async (req, ctx) => {
    try {
      const caller = ctx.caller;
      if (!caller) {
        return NextResponse.json({ error: 'Please log in again to join the class.' }, { status: 401 });
      }

      const parsed = await parseAndVerifyJsonBody<{
        roomName?: string;
        participantName?: string;
        sessionId?: string;
      }>(req, ctx);
      if (!parsed.ok) return parsed.response;

      const roomName = sanitizeText(parsed.body.roomName, 128);
      const participantName = sanitizeText(parsed.body.participantName, 100);
      const sessionId = sanitizeText(parsed.body.sessionId || 'main', 32);

      if (!roomName) {
        return NextResponse.json({ error: 'Missing roomName parameter' }, { status: 400 });
      }

      const safeSession = sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'main';
      const identity = `${caller.uid}~${safeSession}`;

      const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity,
        name: participantName || caller.email || 'Student',
        metadata: JSON.stringify({ role: caller.role, uid: caller.uid }),
        ttl: '6h',
      });

      // Admins/teachers publish freely. Students join as viewers only; the teacher
      // grants mic / camera / screen-share per student via /api/livekit/permissions.
      at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: caller.isAdmin,
        canPublishData: caller.isAdmin,
        canSubscribe: true,
      });

      const token = await at.toJwt();
      return NextResponse.json({ token, role: caller.role, identity });
    } catch (error: any) {
      console.error('Error generating LiveKit token:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
);
