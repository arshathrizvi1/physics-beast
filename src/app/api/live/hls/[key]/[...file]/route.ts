import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { resolveCorsOrigin } from '@/security/zero-trust-gate';
import { getAuthenticatedCaller } from '@/security/session';
import {
  getUserEntitlementContext,
  hasLiveClassEntitlement,
} from '@/security/entitlement';

/**
 * Authenticated & Entitlement-Gated HTTPS HLS Proxy for RTMP Live Streams.
 * Never allows unauthenticated or unpaid students to stream live RTMP feeds.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string; file: string[] }> }
) {
  try {
    const { key, file } = await context.params;
    if (!key || !/^[a-zA-Z0-9_-]+$/.test(key)) {
      return new NextResponse('Bad Request: Invalid stream key', { status: 400 });
    }
    const filePath = file && file.length > 0 ? file.join('/') : 'index.m3u8';
    if (!filePath || filePath.includes('..') || filePath.includes('\0') || !/^[a-zA-Z0-9_\-\.\/]+$/.test(filePath)) {
      return new NextResponse('Bad Request: Invalid segment file path', { status: 400 });
    }

    // Require authenticated & entitled caller
    const caller = await getAuthenticatedCaller(request);
    const ent = await getUserEntitlementContext(caller);
    if (!ent || ent.isBanned) {
      return new NextResponse('Unauthorized: Active session required.', { status: 401 });
    }

    if (!ent.isStaff) {
      const [classesSnap, foldersSnap] = await Promise.all([
        adminDb.collection('live_classes').where('streamKey', '==', key).limit(1).get(),
        adminDb.collection('folders').get(),
      ]);

      const folderCourseMap = new Map<string, string>();
      foldersSnap.docs.forEach((d) => {
        const data = d.data() || {};
        if (data.courseId) folderCourseMap.set(d.id, String(data.courseId));
      });

      if (classesSnap.empty) {
        return new NextResponse('Forbidden: Stream not found or unauthorized.', { status: 403 });
      }

      const cls = { id: classesSnap.docs[0].id, ...(classesSnap.docs[0].data() || {}) };
      if (!hasLiveClassEntitlement(ent, cls, folderCourseMap)) {
        return new NextResponse('Payment Required: You do not have access to this live stream.', {
          status: 403,
        });
      }
    }

    const host = process.env.NEXT_PUBLIC_RTMP_SERVER_HOST || '13.60.252.104';
    const port = process.env.NEXT_PUBLIC_RTMP_HTTP_PORT || '8000';

    const targetUrl = `http://${host}:${port}/live/${key}/${filePath}`;

    const upstreamRes = await fetch(targetUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store',
      }
    });

    if (!upstreamRes.ok) {
      return new NextResponse(`Segment not ready or stream ended (${upstreamRes.status})`, {
        status: upstreamRes.status,
      });
    }

    const contentType = filePath.endsWith('.m3u8')
      ? 'application/vnd.apple.mpegurl'
      : filePath.endsWith('.ts')
      ? 'video/MP2T'
      : 'application/octet-stream';

    const allowedOrigin = resolveCorsOrigin(request);
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    responseHeaders.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    return new NextResponse(upstreamRes.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[HLS Proxy] Error:', error);
    return new NextResponse(error.message || 'Stream proxy error', { status: 502 });
  }
}
