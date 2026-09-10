import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * RTMP Server Callback Endpoint
 * 
 * Called by the self-hosted RTMP server when:
 * - A stream STARTS → auto-updates live class status to "live"
 * - A stream ENDS   → auto-uploads recording to Bunny, creates video in folder
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, streamKey, secret, hasRecording, bunnyVideoId, bunnyLibraryId } = body;

    // Validate the shared secret
    const expectedSecret = process.env.RTMP_CALLBACK_SECRET || 'change-me-to-a-random-string';
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!streamKey) {
      return NextResponse.json({ error: 'Missing streamKey' }, { status: 400 });
    }

    // Find the live class that uses this stream key
    const liveSnapshot = await adminDb
      .collection('live_classes')
      .where('streamKey', '==', streamKey)
      .limit(1)
      .get();

    if (liveSnapshot.empty) {
      console.log(`[RTMP Callback] No live class found for streamKey: ${streamKey}`);
      return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
    }

    const liveDoc = liveSnapshot.docs[0];
    const liveData = liveDoc.data();

    // ─── STREAM STARTED ───────────────────────────────────────
    if (event === 'stream_started') {
      console.log(`[RTMP Callback] Stream started: ${liveData.title}`);
      
      // Auto-update status to "live"
      await liveDoc.ref.update({ status: 'live' });

      // Send notification to students
      await adminDb.collection('notifications').add({
        title: "🔴 LIVE Class Started!",
        message: `"${liveData.title}" is now LIVE! Click here to join the broadcast.`,
        type: "live_class",
        target: "all_students",
        link: "/live",
        timestamp: Date.now(),
        createdAt: Date.now(),
        readBy: []
      });

      return NextResponse.json({ success: true, action: 'stream_started' });
    }

    // ─── STREAM ENDED ─────────────────────────────────────────
    if (event === 'stream_ended') {
      console.log(`[RTMP Callback] Stream ended: ${liveData.title}`);

      // Update status to "ended"
      await liveDoc.ref.update({ 
        status: 'ended',
        vodUploaded: !!bunnyVideoId,
        vodVideoId: bunnyVideoId || null
      });

      // If recording was uploaded to Bunny AND there's a target folder, create the video
      if (hasRecording && bunnyVideoId && liveData.targetFolderId) {
        const folderRef = adminDb.collection('folders').doc(liveData.targetFolderId);
        const folderSnap = await folderRef.get();

        if (folderSnap.exists) {
          const folderData = folderSnap.data();
          const actualCourseId = folderData?.courseId || liveData.courseId || null;

          // Create video document
          const videoRef = adminDb.collection('videos').doc();
          const libraryId = bunnyLibraryId || process.env.BUNNY_STREAM_LIBRARY_ID || '748058';
          const videoData: any = {
            id: videoRef.id,
            title: `${liveData.title} (Recorded Live)`,
            description: liveData.description || '',
            videoId: bunnyVideoId,
            libraryId: libraryId,
            url: `https://iframe.mediadelivery.net/embed/${libraryId}/${bunnyVideoId}?autoplay=true`,
            platform: 'bunny',
            courseId: actualCourseId,
            folderId: liveData.targetFolderId,
            type: 'video',
            createdAt: Date.now(),
            views: 0,
            isReady: false
          };

          await videoRef.set(videoData);

          // Add to folder items
          const items = folderData?.items || [];
          await folderRef.update({
            items: [...items, { id: videoRef.id, type: 'video' }]
          });

          console.log(`[RTMP Callback] ✅ Video created in folder: ${videoRef.id}`);

          // Notify admin
          await adminDb.collection('notifications').add({
            title: "🎬 Live Recording Uploaded!",
            message: `Recording of "${liveData.title}" has been automatically uploaded to BunnyCDN and added to the course folder. It will be ready to watch in 1-2 minutes.`,
            type: "admin_alert",
            target: "admin",
            link: actualCourseId ? `/course/${actualCourseId}` : "/admin",
            timestamp: Date.now(),
            createdAt: Date.now(),
            readBy: []
          });
        }
      } else if (!bunnyVideoId && liveData.targetFolderId) {
        // Stream ended but no recording uploaded — notify admin
        await adminDb.collection('notifications').add({
          title: "⚠️ Live Recording Not Available",
          message: `"${liveData.title}" ended but the recording could not be uploaded. Check RTMP server logs.`,
          type: "admin_alert",
          target: "admin",
          link: "/admin/live",
          timestamp: Date.now(),
          createdAt: Date.now(),
          readBy: []
        });
      }

      return NextResponse.json({ success: true, action: 'stream_ended' });
    }

    return NextResponse.json({ error: 'Unknown event' }, { status: 400 });

  } catch (error: any) {
    console.error("[RTMP Callback] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: "RTMP Callback endpoint active" });
}
