import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { secret, videoId, metadata, libraryId } = await request.json();
    const expectedSecret = process.env.RTMP_CALLBACK_SECRET || 'change-me-to-a-random-string';

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    if (!videoId || !metadata) {
      return NextResponse.json({ error: 'Missing videoId or metadata' }, { status: 400 });
    }

    const targetFolderId = metadata.selectedItemType === 'course' ? metadata.selectedCourseFolderId : metadata.selectedFolderId;

    const finalUrl = 'https://iframe.mediadelivery.net/embed/' + libraryId + '/' + videoId + '?autoplay=true';

    const videoRef = adminDb.collection('videos').doc(metadata.videoDocId);
    
    // We fetch the existing video document first to preserve any data,
    // although `set` with `{ merge: true }` is better.
    const videoData = {
      id: metadata.videoDocId,
      title: metadata.videoTitle,
      description: '',
      url: finalUrl,
      videoId: videoId,
      libraryId: libraryId,
      platform: 'bunny',
      courseId: metadata.selectedCourseId === 'none' || !metadata.selectedCourseId ? null : metadata.selectedCourseId,
      folderId: targetFolderId,
      type: 'video',
      isReady: true,
      processingStatus: 'ready',
      updatedAt: Date.now(),
    };

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
