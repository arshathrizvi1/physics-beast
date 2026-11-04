import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';
import {
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_HOST,
  uidFromIdentity,
} from '@/lib/livekitServer';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { sanitizeText } from '@/security/sanitize';

// LiveKit TrackSource enum values: CAMERA=1, MICROPHONE=2, SCREEN_SHARE=3, SCREEN_SHARE_AUDIO=4
const ALLOWED_SOURCES = [1, 2, 3, 4];

export const POST = withZeroTrustGate(
  {
    scope: 'livekit_permissions',
    limit: 60,
    windowMs: 60 * 1000,
    requireAuth: 'authenticated',
  },
  async (req, ctx) => {
    try {
      const caller = ctx.caller;
      if (!caller) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const parsed = await parseAndVerifyJsonBody<{
        roomName?: string;
        identity?: string;
        sources?: number[];
      }>(req, ctx);
      if (!parsed.ok) return parsed.response;

      const roomName = sanitizeText(parsed.body.roomName, 128);
      const identity = sanitizeText(parsed.body.identity, 128);
      const sources = parsed.body.sources;

      if (!roomName || !identity || !Array.isArray(sources)) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
      }

      let desired: number[] = Array.from(
        new Set<number>(sources.map(Number).filter((s: number) => ALLOWED_SOURCES.includes(s)))
      );

      const svc = new RoomServiceClient(LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

      if (!caller.isAdmin) {
        // Students can only lower their own access (e.g. when they mute), never raise it.
        if (uidFromIdentity(identity) !== caller.uid) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const participant: any = await svc.getParticipant(roomName, identity);
        const perm = participant?.permission;
        const current: number[] = perm?.canPublish ? Array.from(perm.canPublishSources || []) : [];
        desired = desired.filter((s) => current.includes(s));
      }

      await (svc as any).updateParticipant(roomName, identity, undefined, {
        canSubscribe: true,
        canPublish: desired.length > 0,
        canPublishData: false,
        canPublishSources: desired,
      });

      return NextResponse.json({ success: true, sources: desired });
    } catch (error: any) {
      console.error('Error updating permissions:', error);
      return NextResponse.json({ error: error.message || 'Failed to update permissions' }, { status: 500 });
    }
  }
);
