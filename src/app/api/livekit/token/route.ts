import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, verifyCaller } from '@/lib/livekitServer';

export async function POST(req: NextRequest) {
  try {
    const caller = await verifyCaller(req);
    if (!caller) {
      return NextResponse.json({ error: 'Please log in again to join the class.' }, { status: 401 });
    }

    const { roomName, participantName, sessionId } = await req.json();
    if (!roomName || typeof roomName !== 'string') {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const safeSession = String(sessionId || 'main').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'main';
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
    console.error('Error generating token:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
