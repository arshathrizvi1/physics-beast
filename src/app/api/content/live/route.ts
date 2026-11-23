// ============================================================================
// SERVER-GATED LIVE CLASSES API (/api/content/live, ?id=<classId>, ?statusOnly=1)
// Enforces authoritative payment/folder/batch entitlement before returning
// YouTube Live URLs, Zoom meeting IDs/passwords, RTMP keys, or LiveKit room access.
// ============================================================================

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withZeroTrustGate } from '@/security/zero-trust-gate';
import { sanitizeText } from '@/security/sanitize';
import {
  getUserEntitlementContext,
  hasLiveClassEntitlement,
} from '@/security/entitlement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withZeroTrustGate(
  {
    scope: 'content_live',
    limit: 120,
    windowMs: 60 * 1000,
    requireAuth: 'none',
  },
  async (req, ctx) => {
    try {
      const url = new URL(req.url);
      const statusOnly = url.searchParams.get('statusOnly') === '1';

      // Lightweight boolean indicator for navbar red LIVE dot (ZERO sensitive data!)
      if (statusOnly) {
        const activeSnap = await adminDb
          .collection('live_classes')
          .where('status', '==', 'live')
          .limit(1)
          .get();
        return NextResponse.json(
          { hasLive: !activeSnap.empty },
          { headers: { 'Cache-Control': 'public, max-age=15' } }
        );
      }

      // All actual live class details require strictly authenticated & non-banned caller
      const ent = await getUserEntitlementContext(ctx.caller);
      if (!ent || ent.isBanned) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const classId = sanitizeText(url.searchParams.get('id') || '', 128).trim();
      const now = Date.now();

      // Build authoritative folder -> course mapping on the server
      const foldersSnap = await adminDb.collection('folders').get();
      const folderCourseMap = new Map<string, string>();
      foldersSnap.docs.forEach((d) => {
        const data = d.data() || {};
        if (data.courseId) folderCourseMap.set(d.id, String(data.courseId));
      });

      // Single room request (used by /live/room/[id])
      if (classId) {
        const classDoc = await adminDb.collection('live_classes').doc(classId).get();
        if (!classDoc.exists) {
          return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
        }
        const cls = { id: classDoc.id, ...(classDoc.data() || {}) };
        const entitled = hasLiveClassEntitlement(ent, cls, folderCourseMap, now);
        if (!entitled) {
          return NextResponse.json(
            { error: 'Payment required: You do not have active access to this live class.', locked: true },
            { status: 403 }
          );
        }
        return NextResponse.json(
          { liveClass: cls },
          { headers: { 'Cache-Control': 'private, no-store, no-cache' } }
        );
      }

      // Full entitled live classes list (used by /live)
      const classesSnap = await adminDb.collection('live_classes').get();
      const entitledClasses = classesSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() || {}) }))
        .filter((cls: any) => hasLiveClassEntitlement(ent, cls, folderCourseMap, now))
        .sort((a: any, b: any) => {
          if (a.status === 'live' && b.status !== 'live') return -1;
          if (a.status !== 'live' && b.status === 'live') return 1;
          return (a.scheduledFor || 0) - (b.scheduledFor || 0);
        });

      return NextResponse.json(
        { classes: entitledClasses },
        { headers: { 'Cache-Control': 'private, no-store, no-cache' } }
      );
    } catch (err: any) {
      console.error('[API /content/live] Error:', err);
      return NextResponse.json({ error: 'Failed to load live classes' }, { status: 500 });
    }
  }
);
