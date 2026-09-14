import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { secret, videoId, metadata, libraryId, error } = body;
    const expectedSecret = process.env.RTMP_CALLBACK_SECRET || 'change-me-to-a-random-string';

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    if (!metadata) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }
    
    // If AWS EC2 sends a failure notification
    if (error) {
      const videoRef = adminDb.collection('videos').doc(metadata.videoDocId);
      
      // Get the target folder so we can remove the ghost item
      const targetFolderId = metadata.selectedItemType === 'course' 
        ? metadata.selectedCourseFolderId 
        : (metadata.selectedFolderId || metadata.videoFolderId || 'none');

      // 1. Remove from folder
      if (targetFolderId && targetFolderId !== 'none') {
        const folderRef = adminDb.collection('folders').doc(targetFolderId);
        const folderSnap = await folderRef.get();
        if (folderSnap.exists) {
          const folderData = folderSnap.data();
          const items = folderData?.items || [];
          const newItems = items.filter((i: any) => i.id !== metadata.videoDocId);
          await folderRef.update({ items: newItems });
        }
      }

      // 2. Delete the broken video document
      await videoRef.delete();

      // 3. Notify Admins
      await adminDb.collection('notifications').add({
        title: "❌ Video Download Failed",
        message: `The automatic download for "${metadata.videoTitle || 'Unknown Video'}" failed on the AWS Server. Error: ${error}. The ghost video has been removed from the folder.`,
        type: "error",
        link: "/admin",
        createdAt: Date.now(),
        isGlobal: true, // Show to all admins
        readBy: [],
        clearedBy: []
      });

      return NextResponse.json({ success: true, noted: 'Error recorded, rolled back.' });
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
    }

    const targetFolderId = metadata.selectedItemType === 'course' 
      ? metadata.selectedCourseFolderId 
      : (metadata.selectedFolderId || metadata.videoFolderId || 'none');

    const courseIdRaw = metadata.selectedCourseId || metadata.videoCourseId || 'none';
    const courseIdClean = (courseIdRaw === 'none' || !courseIdRaw) ? null : courseIdRaw;

    const finalUrl = 'https://iframe.mediadelivery.net/embed/' + libraryId + '/' + videoId + '?autoplay=true';

    const videoRef = adminDb.collection('videos').doc(metadata.videoDocId);
    
    // We fetch the existing video document first to preserve any data,
    // although `set` with `{ merge: true }` is better.
    const videoData = {
      id: metadata.videoDocId,
      title: metadata.videoTitle || 'Untitled Video',
      description: '',
      url: finalUrl,
      videoId: videoId,
      libraryId: libraryId,
      platform: 'bunny',
      courseId: courseIdClean,
      folderId: targetFolderId,
      type: 'video',
      isReady: true,
      processingStatus: 'ready',
      updatedAt: Date.now(),
    };

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
      title: "Live Recording Processed",
      message: `The YouTube/Zoom recording "${metadata.videoTitle}" has been automatically downloaded, uploaded to BunnyCDN, and saved to the folder.`,
      type: "info",
      link: "/admin/library",
      createdAt: Date.now(),
      isGlobal: true, // Show to all admins
      readBy: [],
      clearedBy: []
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('AWS Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
