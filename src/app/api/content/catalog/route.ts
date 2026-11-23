// ============================================================================
// SERVER-GATED PUBLIC & SEARCH CATALOG API (/api/content/catalog)
// Replaces direct client queries on `videos` and `exams` from Home, Courses,
// and GlobalSearchModal. NEVER returns video URLs, YouTube IDs, R2 paths,
// exam questions, or answer keys!
// ============================================================================

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withZeroTrustGate } from '@/security/zero-trust-gate';
import {
  getUserEntitlementContext,
  stripSensitiveVideoFields,
  sanitizeExamDocument,
} from '@/security/entitlement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withZeroTrustGate(
  {
    scope: 'content_catalog',
    limit: 90,
    windowMs: 60 * 1000,
    requireAuth: 'none',
  },
  async (req, ctx) => {
    try {
      const url = new URL(req.url);
      const includeExams = url.searchParams.get('includeExams') === '1';
      const limitVideos = Math.min(300, Math.max(20, Number(url.searchParams.get('limit') || 150)));

      const ent = await getUserEntitlementContext(ctx.caller);

      const promises: Promise<any>[] = [
        adminDb.collection('videos').limit(limitVideos).get(),
      ];

      if (includeExams && ent) {
        promises.push(adminDb.collection('exams').limit(150).get());
      }

      const [videosSnap, examsSnap] = await Promise.all(promises);

      // ALWAYS strip URLs/IDs from catalog index — playback only happens inside /course/[id] after entitlement check
      const videos = (videosSnap?.docs || []).map((d: any) =>
        stripSensitiveVideoFields({ id: d.id, ...(d.data() || {}) })
      );

      const exams = (examsSnap?.docs || [])
        .map((d: any) => ({ id: d.id, ...(d.data() || {}) }))
        .filter((e: any) => !e.hidden && !e.deleted)
        .map((e: any) =>
          sanitizeExamDocument(e, {
            includeQuestions: false,
            revealAnswers: false,
            hasAccess: false,
          })
        );

      return NextResponse.json(
        { videos, exams },
        {
          headers: {
            'Cache-Control': 'private, max-age=60',
          },
        }
      );
    } catch (err: any) {
      console.error('[API /content/catalog] Error:', err);
      return NextResponse.json({ error: 'Failed to load catalog metadata' }, { status: 500 });
    }
  }
);
