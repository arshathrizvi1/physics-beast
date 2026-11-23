import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { sanitizePlainText, sanitizeUrl } from '@/security/sanitize';
import { getServerEnv, timingSafeCompare } from '@/security/env';

export const POST = withZeroTrustGate(
  {
    scope: 'apify_webhook',
    limit: 30,
    windowMs: 60 * 1000,
    requireAuth: 'none',
    requireCsrfOrigin: false,
  },
  async (request, ctx) => {
    try {
      const env = getServerEnv();
      const providedSecret =
        request.headers.get('x-apify-webhook-secret') ||
        request.headers.get('x-webhook-secret') ||
        '';
      const validSecrets = [
        env.PAYMENT_WEBHOOK_SECRET,
        env.RTMP_CALLBACK_SECRET,
        process.env.WEBHOOK_SHARED_SECRET,
        process.env.WEBHOOK_SECRET,
      ].filter(Boolean) as string[];

      const isAuthorized =
        Boolean(providedSecret) &&
        validSecrets.some((s) => timingSafeCompare(providedSecret, s));

      if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized webhook signature' }, { status: 401 });
      }

      const parsed = await parseAndVerifyJsonBody<Record<string, any>>(request, ctx);
      if (!parsed.ok) return parsed.response;

      const body = parsed.body;
      const datasetId = sanitizePlainText(body.datasetId, 128);
      const metadata = body.metadata;
      const title = sanitizePlainText(body.title, 200);

      if (!datasetId || !metadata || typeof metadata !== 'object' || !/^[a-zA-Z0-9_-]+$/.test(datasetId)) {
        return NextResponse.json({ error: 'Missing valid data from Apify Webhook' }, { status: 400 });
      }

      const videoDocId = sanitizePlainText(metadata.videoDocId, 128);
      if (!videoDocId || !/^[a-zA-Z0-9_-]{3,128}$/.test(videoDocId)) {
        return NextResponse.json({ error: 'Invalid videoDocId' }, { status: 400 });
      }

      const apifyToken = process.env.APIFY_API_TOKEN;
      const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
      const bunnyApiKey = process.env.BUNNY_STREAM_API_KEY;
      if (!apifyToken || !libraryId || !bunnyApiKey) {
        return NextResponse.json({ error: 'Required video pipeline credentials are missing' }, { status: 500 });
      }

      const datasetRes = await fetch(
        `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?token=${encodeURIComponent(apifyToken)}`
      );
      if (!datasetRes.ok) {
        throw new Error('Failed to retrieve Apify dataset');
      }
      const items = await datasetRes.json();

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('No items found in Apify dataset');
      }

      const item = items[0];
      const mp4Url = sanitizeUrl(item.output?.url || item.downloadUrl || item.url || item.videoUrl);
      if (!mp4Url || !mp4Url.startsWith('https://')) {
        throw new Error('No valid HTTPS download URL found in Apify result');
      }

      // Create Bunny Stream video directly on the server (avoids unauthenticated internal self-fetch)
      const videoTitle = title || sanitizePlainText(metadata.videoTitle, 200) || 'Fetched Video';
      const createRes = await fetch(`https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos`, {
        method: 'POST',
        headers: {
          AccessKey: bunnyApiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ title: videoTitle }),
      });
      if (!createRes.ok) {
        throw new Error('Bunny video creation failed');
      }
      const createdVideo = await createRes.json();
      const videoId = sanitizePlainText(createdVideo.guid, 128);
      if (!videoId) {
        throw new Error('Missing Bunny videoId');
      }

      const fetchRes = await fetch(
        `https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos/${encodeURIComponent(videoId)}/fetch`,
        {
          method: 'POST',
          headers: {
            AccessKey: bunnyApiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ url: mp4Url }),
        }
      );
      if (!fetchRes.ok) {
        throw new Error('Bunny Fetch API failed');
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
        target: 'admin',
        link: '/admin/library',
        createdAt: Date.now(),
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
