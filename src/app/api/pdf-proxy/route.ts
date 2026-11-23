import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { resolveCorsOrigin, withZeroTrustGate } from '@/security/zero-trust-gate';
import {
  getUserEntitlementContext,
  hasCourseOrFolderEntitlement,
  hasExamEntitlement,
} from '@/security/entitlement';

export const dynamic = 'force-dynamic';

function isAllowedPdfHost(hostname: string): boolean {
  const clean = hostname.toLowerCase();
  if (
    clean === 'localhost' ||
    clean === '127.0.0.1' ||
    clean === '0.0.0.0' ||
    clean === '::1' ||
    clean === '169.254.169.254' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean) ||
    clean.endsWith('.internal') ||
    clean.endsWith('.local')
  ) {
    return false;
  }

  return (
    clean === 'brillliantacademy.site' ||
    clean === 'www.brillliantacademy.site' ||
    clean === 'brilliantacademy.site' ||
    clean === 'www.brilliantacademy.site' ||
    clean.endsWith('.r2.dev') ||
    clean.endsWith('.cloudflarestorage.com') ||
    clean === 'firebasestorage.googleapis.com' ||
    clean.endsWith('.b-cdn.net')
  );
}

export const GET = withZeroTrustGate(
  {
    scope: 'pdf_proxy',
    limit: 60,
    windowMs: 60 * 1000,
    requireAuth: 'authenticated',
  },
  async (req: Request, ctx) => {
    const ent = await getUserEntitlementContext(ctx.caller);
    if (!ent || ent.isBanned) {
      return new NextResponse('Unauthorized: Active authenticated session required.', { status: 401 });
    }

    const urlObj = new URL(req.url);
    const targetUrl = urlObj.searchParams.get('url');

    if (!targetUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return new NextResponse('Invalid target URL', { status: 400 });
    }

    if (parsed.protocol !== 'https:') {
      return new NextResponse('Only secure HTTPS resources are allowed', { status: 403 });
    }

    if (!isAllowedPdfHost(parsed.hostname)) {
      return new NextResponse('Access Denied: Target host is not permitted by PDF proxy policy.', {
        status: 403,
      });
    }

    // Fail-closed Server-Side Entitlement Gate for non-staff callers hitting Next.js directly
    if (!ent.isStaff) {
      let authorized = false;
      const normalizedTarget = targetUrl.trim();
      const [videosSnap, examsSnap, myResultsSnap] = await Promise.all([
        adminDb.collection('videos').limit(500).get(),
        adminDb.collection('exams').limit(200).get(),
        adminDb.collection('examResults').where('userId', '==', ent.uid).limit(100).get(),
      ]);

      for (const d of videosSnap.docs) {
        const v = d.data() || {};
        const urls = [v.url, v.r2Url, v.pdfUrl].filter((u) => typeof u === 'string').map((u) => u.trim());
        if (urls.includes(normalizedTarget)) {
          if (
            hasCourseOrFolderEntitlement(ent, {
              courseId: v.courseId,
              folderId: v.folderId,
              isFree: v.isFree === true,
            })
          ) {
            authorized = true;
            break;
          }
        }
      }

      if (!authorized) {
        const now = Date.now();
        for (const d of examsSnap.docs) {
          const e = d.data() || {};
          const examEnded = e.endTime ? now >= Number(e.endTime) : true;
          const isQuestionPdf = typeof e.questionPdfUrl === 'string' && e.questionPdfUrl.trim() === normalizedTarget;
          const isMarkingPdf =
            typeof e.markingSchemeUrl === 'string' &&
            e.markingSchemeUrl.trim() === normalizedTarget &&
            (e.gradesPublished === true || examEnded);
          if ((isQuestionPdf || isMarkingPdf) && hasExamEntitlement(ent, e, now)) {
            authorized = true;
            break;
          }
        }
      }

      if (!authorized) {
        for (const d of myResultsSnap.docs) {
          const r = d.data() || {};
          if (
            (typeof r.answerPdfUrl === 'string' && r.answerPdfUrl.trim() === normalizedTarget) ||
            (typeof r.correctedPdfUrl === 'string' && r.correctedPdfUrl.trim() === normalizedTarget)
          ) {
            authorized = true;
            break;
          }
        }
      }

      if (!authorized) {
        return new NextResponse('Payment Required: You do not have active access to this document.', {
          status: 403,
        });
      }
    }

    try {
      const upstreamRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BrilliantAcademy/1.0',
        },
        redirect: 'error',
      });

      if (!upstreamRes.ok) {
        return new NextResponse(`Upstream error: ${upstreamRes.status}`, {
          status: upstreamRes.status,
        });
      }

      const contentType = upstreamRes.headers.get('content-type') || 'application/pdf';
      const allowedOrigin = resolveCorsOrigin(req);

      return new NextResponse(upstreamRes.body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, no-store, no-cache',
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (err: any) {
      console.error('PDF Proxy error:', err);
      return new NextResponse('Proxy failed: ' + err.message, { status: 502 });
    }
  }
);
