import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

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

    // Determine target folder based on whether it is a course or root
    const targetFolderId = metadata.selectedItemType === 'course' ? metadata.selectedCourseFolderId : metadata.selectedFolderId;

    const finalUrl = 'https://iframe.mediadelivery.net/embed/' + libraryId + '/' + videoId + '?autoplay=true';

    const videoRef = doc(db, 'videos', metadata.videoDocId);
    
    const videoData = {
      id: metadata.videoDocId,
      title: metadata.videoTitle,
      description: metadata.videoDescription || '',
      url: finalUrl,
      videoId: videoId,
      libraryId: libraryId,
      platform: 'bunny',
      courseId: metadata.selectedCourseId === 'none' ? null : metadata.selectedCourseId,
      folderId: targetFolderId,
      type: 'video',
      isReady: true,
      processingStatus: 'ready',
      createdAt: Date.now(),
      views: 0
    };

    await setDoc(videoRef, videoData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('AWS Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
