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

    const targetFolderId = metadata.videoFolderId;

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
      courseId: metadata.videoCourseId === 'none' || !metadata.videoCourseId ? null : metadata.videoCourseId,
      folderId: targetFolderId,
      type: 'video',
      isReady: true,
      processingStatus: 'ready',
      updatedAt: Date.now(),
    };

    // Use merge: true to avoid overwriting views or createdAt
    await videoRef.set(videoData, { merge: true });

    // Note: We DO NOT update the folder's items array here because 
    // the frontend already appended the video placeholder to the folder immediately when the upload started.

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
