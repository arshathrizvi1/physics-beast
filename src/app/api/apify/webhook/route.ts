import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { sanitizePlainText, sanitizeUrl } from '@/security/sanitize';
import { getServerEnv, timingSafeCompare } from '@/security/env';

export const POST = withZeroTrustGate(
  {
    routeId: '/api/apify/webhook',
    rateLimitBucket: 'webhook',
    requireAuth: 'none',
    verifyCsrfOrigin: false,
  },
  async (request: NextRequest) => {
    try {
      const env = getServerEnv();
      const providedSecret =
        request.headers.get('x-apify-webhook-secret') ||
        new URL(request.url).searchParams.get('secret') ||
        '';
      if (process.env.NODE_ENV === 'production' && (!providedSecret || !timingSafeCompare(providedSecret, env.WEBHOOK_SHARED_SECRET))) {
        return NextResponse.json({ error: 'Unauthorized webhook signature' }, { status: 401 });
      }

      const parsed = await parseAndVerifyJsonBody<Record<string, any>>(request);
      if (!parsed.ok) return parsed.response;

      const body = parsed.data;
      const datasetId = sanitizePlainText(body.datasetId, 128);
      const metadata = body.metadata;
      const title = sanitizePlainText(body.title, 200);

      if (!datasetId || !metadata || typeof metadata !== 'object' || !/^[a-zA-Z0-9_-]+$/.test(datasetId)) {
        return NextResponse.json({ error: 'Missing valid data from Apify Webhook' }, { status: 400 });
      }

      const apifyToken = process.env.APIFY_API_TOKEN;
      if (!apifyToken) {
        return NextResponse.json({ error: 'Missing APIFY_API_TOKEN' }, { status: 500 });
      }

      const datasetRes = await fetch(
        `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?token=${encodeURIComponent(apifyToken)}`
      );
      const items = await datasetRes.json();

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('No items found in Apify dataset');
      }

      const item = items[0];
      const mp4Url = sanitizeUrl(item.output?.url || item.downloadUrl || item.url || item.videoUrl);

      if (!mp4Url) {
        throw new Error('No valid download URL found in Apify result');
      }

      const websiteUrl = process.env.WEBSITE_URL || 'https://brillliantacademy.site';
      const bunnyFetchUrl = `${websiteUrl}/api/bunny/fetch`;

      const fetchRes = await fetch(bunnyFetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: mp4Url,
          title: title || sanitizePlainText(metadata.videoTitle, 200),
        }),
      });

      const fetchData = await fetchRes.json();
      if (!fetchRes.ok) {
        throw new Error('Bunny Fetch API failed');
      }

      const videoId = sanitizePlainText(fetchData.videoId, 128);
      const libraryId = sanitizePlainText(fetchData.libraryId, 64);
      const videoDocId = sanitizePlainText(metadata.videoDocId, 128);

      if (!videoDocId) {
        return NextResponse.json({ error: 'Missing videoDocId' }, { status: 400 });
      }

      const finalUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true`;
      const videoRef = adminDb.collection('videos').doc(videoDocId);

      await videoRef.set(
        {
          id: videoDocId,
          title: sanitizePlainText(metadata.videoTitle, 200),
          description: '',
          url: finalUrl,
          videoId,
          libraryId,
          platform: 'bunny',
          courseId:
            metadata.videoCourseId === 'none' || !metadata.videoCourseId
              ? null
              : sanitizePlainText(metadata.videoCourseId, 128),
          folderId: sanitizePlainText(metadata.videoFolderId, 128),
          type: 'video',
          isReady: false,
          processingStatus: 'transcoding',
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      await adminDb.collection('notifications').add({
        title: 'YouTube Video Fetched to Bunny',
        message: `The YouTube video "${sanitizePlainText(metadata.videoTitle, 200)}" has been converted by Apify and is now being transcoded by BunnyCDN.`,
        type: 'info',
        link: '/admin/library',
        createdAt: Date.now(),
        isGlobal: true,
        readBy: [],
        clearedBy: [],
      });

      return NextResponse.json({ success: true });
    } catch (err: any) {
      console.error('Apify Webhook Error:', err);
      return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
  }
);
