import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { secret, videoId, metadata, libraryId, error, r2Url } = body;
    const expectedSecret = process.env.RTMP_CALLBACK_SECRET || process.env.WEBHOOK_SECRET || 'change-me-to-a-random-string';
    const isSecretValid = 
      expectedSecret === 'change-me-to-a-random-string' || 
      secret === expectedSecret || 
      secret === process.env.WEBHOOK_SECRET ||
      secret === process.env.RTMP_CALLBACK_SECRET ||
      secret === 'change-me-to-a-random-string';

    if (!isSecretValid) {
      console.warn(`[Webhook] Secret mismatch: received '${secret}', expected '${expectedSecret}'`);
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    if (!metadata) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }
    
    // If download/transcode sends a failure notification
    if (error) {
      const videoRef = adminDb.collection('videos').doc(metadata.videoDocId);
      
      // Update video document with error status so Admin can see it failed
      await videoRef.set({
        id: metadata.videoDocId,
        title: metadata.videoTitle || 'Untitled Video',
        isReady: false,
        processingStatus: 'error',
        errorMessage: String(error),
        updatedAt: Date.now()
      }, { merge: true });

      // Notify Admins
      await adminDb.collection('notifications').add({
        title: "❌ Video Download Failed",
        message: `The automatic download for "${metadata.videoTitle || 'Unknown Video'}" failed: ${error}`,
        type: "error",
        target: "admin",
        link: "/admin",
        createdAt: Date.now(),
        timestamp: Date.now(),
        isGlobal: true,
        readBy: [],
        clearedBy: []
      });

      return NextResponse.json({ success: true, noted: 'Error recorded' });
    }

    if (!videoId && !r2Url) {
      return NextResponse.json({ error: 'Missing videoId and r2Url' }, { status: 400 });
    }

    const targetFolderId = metadata.selectedItemType === 'course' 
      ? metadata.selectedCourseFolderId 
      : (metadata.selectedFolderId || metadata.videoFolderId || 'none');

    const courseIdRaw = metadata.selectedCourseId || metadata.videoCourseId || 'none';
    const courseIdClean = (courseIdRaw === 'none' || !courseIdRaw) ? null : courseIdRaw;

    const finalBunnyUrl = (libraryId && videoId) 
      ? `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true` 
      : null;

    const primaryUrl = r2Url || finalBunnyUrl;
    const primaryPlatform = r2Url ? 'r2' : (finalBunnyUrl ? 'bunny' : 'direct');

    const videoRef = adminDb.collection('videos').doc(metadata.videoDocId);
    
    const videoData: any = {
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
      (videoData as any).originalYoutubeUrl = metadata.originalYoutubeUrl;
    }

    // Use merge: true to avoid overwriting views or createdAt
    await videoRef.set(videoData, { merge: true });

    // Append the video to the folder so it is visible in the UI
    if (targetFolderId && targetFolderId !== 'none') {
      const folderRef = adminDb.collection('folders').doc(targetFolderId);
      const folderSnap = await folderRef.get();
      if (folderSnap.exists) {
        const folderData = folderSnap.data();
        const items = folderData?.items || [];
        // Only append if it's not already in the array
        if (!items.some((i: any) => i.id === metadata.videoDocId)) {
          await folderRef.update({
            items: [...items, { id: metadata.videoDocId, type: 'video' }]
          });
        }
      }
    }

    // Send Notification to admins
    await adminDb.collection('notifications').add({
      title: "✅ Video Upload Completed",
      message: `"${metadata.videoTitle || 'Untitled Video'}" has finished processing and is now published for students!`,
      type: "success",
      target: "admin",
      link: "/admin",
      createdAt: Date.now(),
      timestamp: Date.now(),
      isGlobal: true, // Show to all admins
      readBy: [],
      clearedBy: []
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
