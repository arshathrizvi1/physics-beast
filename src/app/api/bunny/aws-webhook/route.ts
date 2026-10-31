import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getServerEnv } from '@/security/env';
import { timingSafeEqualStr } from '@/security/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { secret, videoId, metadata, libraryId, error, r2Url } = body;
    const env = getServerEnv();
    const expectedSecret = env.RTMP_CALLBACK_SECRET;

    const isSecretValid =
      Boolean(secret) &&
      Boolean(expectedSecret) &&
      timingSafeEqualStr(String(secret), String(expectedSecret));

    if (!isSecretValid) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    if (!metadata) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    if (error) {
      const videoRef = adminDb.collection('videos').doc(metadata.videoDocId);

      await videoRef.set(
        {
          id: metadata.videoDocId,
          title: metadata.videoTitle || 'Untitled Video',
          isReady: false,
          processingStatus: 'error',
          errorMessage: String(error),
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

    const videoRef = adminDb.collection('videos').doc(metadata.videoDocId);

    const videoData: Record<string, unknown> = {
      id: metadata.videoDocId,
      title: metadata.videoTitle || 'Untitled Video',
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

    if (targetFolderId && targetFolderId !== 'none') {
      const folderRef = adminDb.collection('folders').doc(targetFolderId);
      const folderSnap = await folderRef.get();
      if (folderSnap.exists) {
        const folderData = folderSnap.data();
        const items = folderData?.items || [];
        if (!items.some((i: any) => i.id === metadata.videoDocId)) {
          await folderRef.update({
            items: [...items, { id: metadata.videoDocId, type: 'video' }],
          });
        }
      }
    }

    await adminDb.collection('notifications').add({
      title: '✅ Video Upload Completed',
      message: `"${metadata.videoTitle || 'Untitled Video'}" has finished processing and is now published for students!`,
      type: 'success',
      target: 'admin',
      link: '/admin',
      createdAt: Date.now(),
      timestamp: Date.now(),
      isGlobal: true,
      readBy: [],
      clearedBy: [],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
