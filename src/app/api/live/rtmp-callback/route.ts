import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getServerEnv } from '@/security/env';
import { timingSafeEqualStr } from '@/security/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, streamKey, secret, hasRecording, bunnyVideoId, bunnyLibraryId, r2Url } = body;

    const env = getServerEnv();
    const expectedSecret = env.RTMP_CALLBACK_SECRET;
    const isSecretValid =
      Boolean(secret) &&
      Boolean(expectedSecret) &&
      timingSafeEqualStr(String(secret), String(expectedSecret));

    if (!isSecretValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!streamKey) {
      return NextResponse.json({ error: 'Missing streamKey' }, { status: 400 });
    }

    const liveSnapshot = await adminDb
      .collection('live_classes')
      .where('streamKey', '==', streamKey)
      .limit(1)
      .get();

    if (liveSnapshot.empty) {
      return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
    }

    const liveDoc = liveSnapshot.docs[0];
    const liveData = liveDoc.data();

    if (event === 'stream_started') {
      await liveDoc.ref.update({ status: 'live' });

      await adminDb.collection('notifications').add({
        title: '🔴 LIVE Class Started!',
        message: `"${liveData.title}" is now LIVE! Click here to join the broadcast.`,
        type: 'live_class',
        target: 'all_students',
        link: '/live',
        timestamp: Date.now(),
        createdAt: Date.now(),
        readBy: [],
      });

      return NextResponse.json({ success: true, action: 'stream_started' });
    }

    if (event === 'stream_ended') {
      await liveDoc.ref.update({
        status: 'ended',
        vodUploaded: !!(bunnyVideoId || r2Url),
        vodVideoId: bunnyVideoId || null,
        vodR2Url: r2Url || null,
      });

      if (hasRecording && (bunnyVideoId || r2Url) && liveData.targetFolderId) {
        const folderRef = adminDb.collection('folders').doc(liveData.targetFolderId);
        const folderSnap = await folderRef.get();

        if (folderSnap.exists) {
          const folderData = folderSnap.data();
          const actualCourseId = folderData?.courseId || liveData.courseId || null;

          const videoRef = adminDb.collection('videos').doc();
          const libraryId = bunnyLibraryId || env.BUNNY_STREAM_LIBRARY_ID;
          const videoData: Record<string, unknown> = {
            id: videoRef.id,
            title: `${liveData.title} (Recorded Live)`,
            description: liveData.description || '',
            videoId: bunnyVideoId || null,
            libraryId: bunnyVideoId ? libraryId : null,
            url: bunnyVideoId
              ? `https://iframe.mediadelivery.net/embed/${libraryId}/${bunnyVideoId}?autoplay=true`
              : r2Url || '',
            r2Url: r2Url || null,
            platform: bunnyVideoId ? 'bunny' : 'r2',
            courseId: actualCourseId,
            folderId: liveData.targetFolderId,
            type: 'video',
            createdAt: Date.now(),
            views: 0,
            isReady: true,
            processingStatus: 'ready',
          };

          await videoRef.set(videoData);

          const items = folderData?.items || [];
          await folderRef.update({
            items: [...items, { id: videoRef.id, type: 'video' }],
          });

          const targets = [bunnyVideoId ? 'Bunny' : null, r2Url ? 'Cloudflare R2' : null]
            .filter(Boolean)
            .join(' & ');
          await adminDb.collection('notifications').add({
            title: '🎬 Live Recording Uploaded!',
            message: `Recording of "${liveData.title}" has been automatically uploaded (${targets}) and added to the course folder.`,
            type: 'admin_alert',
            target: 'admin',
            link: actualCourseId ? `/course/${actualCourseId}` : '/admin',
            timestamp: Date.now(),
            createdAt: Date.now(),
            readBy: [],
          });
        }
      } else if (!bunnyVideoId && !r2Url && liveData.targetFolderId) {
        await adminDb.collection('notifications').add({
          title: '⚠️ Live Recording Not Available',
          message: `"${liveData.title}" ended but the recording could not be uploaded. Check RTMP server logs.`,
          type: 'admin_alert',
          target: 'admin',
          link: '/admin/live',
          timestamp: Date.now(),
          createdAt: Date.now(),
          readBy: [],
        });
      }

      return NextResponse.json({ success: true, action: 'stream_ended' });
    }

    return NextResponse.json({ error: 'Unknown event' }, { status: 400 });
  } catch (error: any) {
    console.error('[RTMP Callback] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'RTMP Callback endpoint active' });
}
