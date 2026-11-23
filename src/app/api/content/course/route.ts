// ============================================================================
// SERVER-GATED COURSE CONTENT API (/api/content/course?courseId=<id>)
// Eliminates ALL client-side leaks of YouTube URLs, R2 stream paths, Bunny IDs,
// and PDF URLs for unpaid/locked folders.
// ============================================================================

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withZeroTrustGate } from '@/security/zero-trust-gate';
import { sanitizeText } from '@/security/sanitize';
import {
  getUserEntitlementContext,
  hasCourseOrFolderEntitlement,
  sanitizeEntitledVideo,
  stripSensitiveVideoFields,
  stripSensitiveLiveFields,
} from '@/security/entitlement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withZeroTrustGate(
  {
    scope: 'content_course',
    limit: 90,
    windowMs: 60 * 1000,
    requireAuth: 'none',
  },
  async (req, ctx) => {
    try {
      const url = new URL(req.url);
      const courseId = sanitizeText(url.searchParams.get('courseId') || '', 128).trim();
      if (!courseId) {
        return NextResponse.json({ error: 'Missing courseId parameter' }, { status: 400 });
      }

      const ent = await getUserEntitlementContext(ctx.caller);
      const now = Date.now();

      const [courseSnap, foldersSnap, videosSnap, liveSnap, configSnap] = await Promise.all([
        adminDb.collection('courses').doc(courseId).get(),
        adminDb.collection('folders').where('courseId', '==', courseId).get(),
        adminDb.collection('videos').where('courseId', '==', courseId).get(),
        adminDb
          .collection('live_classes')
          .where('courseId', '==', courseId)
          .where('status', '==', 'ended')
          .get(),
        adminDb.collection('siteConfig').doc('payments').get(),
      ]);

      const course = courseSnap.exists ? { id: courseSnap.id, ...(courseSnap.data() || {}) } : null;

      const folders = foldersSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() || {}) }))
        .sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0))
        .map((f: any) => ({
          ...f,
          hasAccess: hasCourseOrFolderEntitlement(ent, {
            courseId,
            folderId: f.id,
            isFree: f.isFree === true || Number(f.price || 0) === 0 && f.isFree !== false && false,
            nowMs: now,
          }),
        }));

      // Gate every video server-side: NEVER leak YouTube, R2, Bunny, or PDF URLs for locked folders!
      const videos = videosSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() || {}) }))
        .sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0))
        .map((v: any) => {
          const entitled = hasCourseOrFolderEntitlement(ent, {
            courseId,
            folderId: v.folderId || '',
            isFree: v.isFree === true,
            nowMs: now,
          });
          if (entitled) {
            return sanitizeEntitledVideo(v, Boolean(ent?.isStaff));
          }
          return stripSensitiveVideoFields(v);
        });

      // Gate past live recordings the exact same way
      const live = liveSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() || {}) }))
        .sort((a: any, b: any) => (b.scheduledFor || 0) - (a.scheduledFor || 0))
        .map((cls: any) => {
          const entitled = hasCourseOrFolderEntitlement(ent, {
            courseId,
            folderId:
              cls.audienceFolderId && cls.audienceFolderId !== 'all' && cls.audienceFolderId !== 'none'
                ? cls.audienceFolderId
                : '',
            isFree: cls.isFree === true,
            nowMs: now,
          });
          if (entitled) {
            return { ...cls, hasAccess: true, isLocked: false };
          }
          return stripSensitiveLiveFields(cls);
        });

      const paymentConfig = configSnap.exists ? configSnap.data() : null;

      return NextResponse.json(
        {
          course,
          folders,
          videos,
          live,
          paymentConfig,
        },
        {
          headers: {
            'Cache-Control': 'private, no-store, no-cache, must-revalidate',
          },
        }
      );
    } catch (err: any) {
      console.error('[API /content/course] Error:', err);
      return NextResponse.json({ error: 'Failed to load course content' }, { status: 500 });
    }
  }
);
