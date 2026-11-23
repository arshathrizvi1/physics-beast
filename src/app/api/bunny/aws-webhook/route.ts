import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getServerEnv } from '@/security/env';
import { timingSafeEqualStr } from '@/security/session';
import { withZeroTrustGate } from '@/security/zero-trust-gate';
import { sanitizeText, sanitizeUrl } from '@/security/sanitize';

export const POST = withZeroTrustGate(
  {
    scope: 'bunny_aws_webhook',
    limit: 60,
    windowMs: 60 * 1000,
    requireAuth: 'none',
    requireCsrfOrigin: false,
  },
  async (request: Request) => {
  try {
    const body = await request.json();
    const { secret, videoId, metadata, libraryId, error, r2Url: rawR2Url } = body;
    const env = getServerEnv();
    const expectedSecret = env.RTMP_CALLBACK_SECRET;

    const validSecrets = [
      expectedSecret,
      process.env.RTMP_CALLBACK_SECRET,
      process.env.WEBHOOK_SECRET,
    ].filter(Boolean) as string[];

    const isSecretValid =
      Boolean(secret) &&
      validSecrets.some((s) => timingSafeEqualStr(String(secret), s));

    if (!isSecretValid) {
      console.warn(`[AWS Webhook] Rejected: Invalid secret (length ${secret ? String(secret).length : 0})`);
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    if (!metadata || typeof metadata !== 'object') {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const videoDocId = sanitizeText(metadata.videoDocId, 128).trim();
    if (!videoDocId || !/^[a-zA-Z0-9_-]{3,128}$/.test(videoDocId)) {
      return NextResponse.json({ error: 'Invalid videoDocId' }, { status: 400 });
    }

    const r2Url = rawR2Url
      ? (String(rawR2Url).startsWith('/api/r2-media/') ? sanitizeText(rawR2Url, 1024) : sanitizeUrl(rawR2Url))
      : '';

    if (error) {
      const videoRef = adminDb.collection('videos').doc(videoDocId);

      await videoRef.set(
        {
          id: videoDocId,
          title: sanitizeText(metadata.videoTitle || 'Untitled Video', 200),
          isReady: false,
          processingStatus: 'error',
          errorMessage: sanitizeText(error, 500),
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      await adminDb.collection('notifications').add({
        title: '❌ Video Download Failed',
        message: `The automatic download for "${metadata.videoTitle || 'Unknown Video'}" failed: ${error}`,
        type: 'error',
        target: 'admin',
        link: '/admin',
        createdAt: Date.now(),
        timestamp: Date.now(),
        isGlobal: true,
        readBy: [],
        clearedBy: [],
      });

      return NextResponse.json({ success: true, noted: 'Error recorded' });
    }

    if (!videoId && !r2Url) {
      return NextResponse.json({ error: 'Missing videoId and r2Url' }, { status: 400 });
    }

    const targetFolderId =
      metadata.selectedItemType === 'course'
        ? metadata.selectedCourseFolderId
        : metadata.selectedFolderId || metadata.videoFolderId || 'none';

    const courseIdRaw = metadata.selectedCourseId || metadata.videoCourseId || 'none';
    const courseIdClean = courseIdRaw === 'none' || !courseIdRaw ? null : courseIdRaw;

    const finalBunnyUrl =
      libraryId && videoId
        ? `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true`
        : null;

    const primaryUrl = r2Url || finalBunnyUrl;
    const primaryPlatform = r2Url ? 'r2' : finalBunnyUrl ? 'bunny' : 'direct';

    const videoRef = adminDb.collection('videos').doc(videoDocId);

    const videoData: Record<string, unknown> = {
      id: videoDocId,
      title: sanitizeText(metadata.videoTitle || 'Untitled Video', 200),
      description: '',
      url: primaryUrl,
      platform: primaryPlatform,
      courseId: courseIdClean,
      folderId: targetFolderId,
      type: 'video',
      isReady: true,
      processingStatus: 'ready',
      updatedAt: Date.now(),
    };

    if (videoId) {
      videoData.videoId = videoId;
      videoData.libraryId = libraryId;
    }

    if (r2Url) {
      videoData.r2Url = r2Url;
    }

    if (metadata.originalYoutubeUrl) {
      videoData.originalYoutubeUrl = metadata.originalYoutubeUrl;
    }

    await videoRef.set(videoData, { merge: true });

    if (targetFolderId && targetFolderId !== 'none' && /^[a-zA-Z0-9_-]{3,128}$/.test(String(targetFolderId))) {
      const folderRef = adminDb.collection('folders').doc(String(targetFolderId));
      const folderSnap = await folderRef.get();
      if (folderSnap.exists) {
        const folderData = folderSnap.data();
        const items = folderData?.items || [];
        if (!items.some((i: any) => i.id === videoDocId)) {
          await folderRef.update({
            items: [...items, { id: videoDocId, type: 'video' }],
          });
        }
      }
    }

    await adminDb.collection('notifications').add({
      title: '✅ Video Upload Completed',
      message: `"${sanitizeText(metadata.videoTitle || 'Untitled Video', 200)}" has finished processing and is now published for students!`,
      type: 'success',
      target: 'admin',
      link: '/admin',
      createdAt: Date.now(),
      timestamp: Date.now(),
      readBy: [],
      clearedBy: [],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
});
