import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { adminDb } from '@/lib/firebase-admin';
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from '@/lib/livekitServer';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { sanitizeText } from '@/security/sanitize';
import {
  getUserEntitlementContext,
  hasLiveClassEntitlement,
} from '@/security/entitlement';

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

      const ent = await getUserEntitlementContext(caller);
      if (!ent || ent.isBanned) {
        return NextResponse.json({ error: 'Account is unauthorized or suspended.' }, { status: 403 });
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

      // --- SERVER-SIDE LIVE CLASS ENTITLEMENT GATE ---
      if (!ent.isStaff) {
        const classDoc = await adminDb.collection('live_classes').doc(roomName).get();
        if (!classDoc.exists) {
          return NextResponse.json({ error: 'Live class room not found.' }, { status: 404 });
        }
        const cls = { id: classDoc.id, ...(classDoc.data() || {}) } as Record<string, any>;
        if (cls.status !== 'live') {
          return NextResponse.json({ error: 'This live class is not currently active.' }, { status: 403 });
        }

        const foldersSnap = await adminDb.collection('folders').get();
        const folderCourseMap = new Map<string, string>();
        foldersSnap.docs.forEach((d) => {
          const data = d.data() || {};
          if (data.courseId) folderCourseMap.set(d.id, String(data.courseId));
        });

        const entitled = hasLiveClassEntitlement(ent, cls, folderCourseMap);
        if (!entitled) {
          return NextResponse.json(
            { error: 'Payment required: You do not have active access to this live class.' },
            { status: 403 }
          );
        }
      }
      // --- END ENTITLEMENT GATE ---

      const safeSession = sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'main';
      const identity = `${caller.uid}~${safeSession}`;

      const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity,
        name: participantName || ent.name || caller.email || 'Student',
        metadata: JSON.stringify({ role: ent.role, uid: caller.uid }),
        ttl: '6h',
      });

      // Admins/teachers publish freely. Students join as viewers only; the teacher
      // grants mic / camera / screen-share per student via /api/livekit/permissions.
      at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: ent.isStaff,
        canPublishData: ent.isStaff,
        canSubscribe: true,
      });

      const token = await at.toJwt();
      return NextResponse.json({ token, role: ent.role, identity });
    } catch (error: any) {
      console.error('Error generating LiveKit token:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
);
