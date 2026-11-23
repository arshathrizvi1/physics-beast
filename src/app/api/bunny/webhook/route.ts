import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getServerEnv } from '@/security/env';
import { timingSafeEqualStr } from '@/security/session';
import { withZeroTrustGate } from '@/security/zero-trust-gate';

export const POST = withZeroTrustGate(
  {
    scope: 'bunny_webhook',
    limit: 60,
    windowMs: 60 * 1000,
    requireAuth: 'none',
    requireCsrfOrigin: false,
  },
  async (request: Request) => {
    try {
      const url = new URL(request.url);
      const secretHeader =
        request.headers.get('x-webhook-secret') ||
        request.headers.get('x-bunny-signature') ||
        '';
      const authHeader = request.headers.get('authorization') || '';
      const secretQuery = url.searchParams.get('secret') || '';
      const providedSecret =
        secretHeader ||
        (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader) ||
        secretQuery;

      const env = getServerEnv();
      const validSecrets = [
        env.RTMP_CALLBACK_SECRET,
        process.env.BUNNY_STREAM_API_KEY,
        process.env.WEBHOOK_SECRET,
      ].filter(Boolean) as string[];

      const isSecretValid =
        Boolean(providedSecret) &&
        validSecrets.some((s) => timingSafeEqualStr(providedSecret, s));

      if (!isSecretValid) {
        console.warn('[Bunny Webhook] Rejected unauthorized webhook call');
        return NextResponse.json({ error: 'Unauthorized webhook call' }, { status: 401 });
      }

      const body = await request.json();
      const { VideoGuid, Status } = body;

      if (
        !VideoGuid ||
        typeof VideoGuid !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(VideoGuid)
      ) {
        return NextResponse.json({ error: 'Valid UUID VideoGuid is required' }, { status: 400 });
      }

      const numericStatus = Number(Status);
      const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
      const apiKey = process.env.BUNNY_STREAM_API_KEY;

      let videoTitle = 'Uploaded Video';

      if (libraryId && apiKey) {
        try {
          const bunnyRes = await fetch(
            `https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos/${encodeURIComponent(VideoGuid)}`,
            {
              headers: {
                AccessKey: apiKey,
                Accept: 'application/json',
              },
            }
          );
          if (bunnyRes.ok) {
            const bunnyData = await bunnyRes.json();
            if (bunnyData.title) {
              videoTitle = String(bunnyData.title).slice(0, 200);
            }
          }
        } catch (err) {
          console.error('Error fetching video details from Bunny:', err);
        }
      }

      let courseId = null;
      const videoSnap = await adminDb.collection('videos').where('videoId', '==', VideoGuid).get();

      if (!videoSnap.empty) {
        const videoDoc = videoSnap.docs[0];
        const videoData = videoDoc.data();
        videoTitle = videoData.title || videoTitle;
        courseId = videoData.courseId || null;

        await videoDoc.ref.update({
          processingStatus:
            numericStatus === 3
              ? 'ready'
              : numericStatus === 4 || numericStatus === 5
              ? 'error'
              : 'processing',
          isReady: numericStatus === 3,
          updatedAt: Date.now(),
        });
      }

      if (numericStatus === 3) {
        await adminDb.collection('notifications').add({
          title: '🎬 Video Processing Complete!',
          message: `Your video "${videoTitle}" has finished processing in BunnyCDN and is ready to stream.`,
          type: 'admin_alert',
          target: 'admin',
          link: courseId ? `/course/${courseId}` : '/admin',
          timestamp: Date.now(),
          createdAt: Date.now(),
          readBy: [],
        });
      } else if (numericStatus === 4 || numericStatus === 5) {
        await adminDb.collection('notifications').add({
          title: '⚠️ Video Processing Failed',
          message: `Processing for video "${videoTitle}" on BunnyCDN encountered an error.`,
          type: 'admin_alert',
          target: 'admin',
          link: '/admin',
          timestamp: Date.now(),
          createdAt: Date.now(),
          readBy: [],
        });
      }

      return NextResponse.json({ success: true, status: numericStatus });
    } catch (error: any) {
      console.error('Bunny Webhook Error:', error);
      return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
  }
);

export const GET = withZeroTrustGate(
  {
    scope: 'bunny_webhook_health',
    limit: 30,
    windowMs: 60 * 1000,
    requireAuth: 'none',
    requireCsrfOrigin: false,
  },
  async () => {
    return NextResponse.json({ status: 'Bunny Webhook listener active' });
  }
);
