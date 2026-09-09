import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Bunny Webhook received payload:", body);

    const { VideoLibraryId, VideoGuid, Status } = body;

    if (!VideoGuid) {
      return NextResponse.json({ error: "Missing VideoGuid" }, { status: 400 });
    }

    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_STREAM_API_KEY;

    let videoTitle = "Uploaded Video";

    // 1. Fetch title from Bunny API if key exists
    if (libraryId && apiKey) {
      try {
        const bunnyRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${VideoGuid}`, {
          headers: {
            'AccessKey': apiKey,
            'Accept': 'application/json'
          }
        });
        if (bunnyRes.ok) {
          const bunnyData = await bunnyRes.json();
          if (bunnyData.title) {
            videoTitle = bunnyData.title;
          }
        }
      } catch (err) {
        console.error("Error fetching video details from Bunny:", err);
      }
    }

    // 2. Find video in Firestore
    let courseId = null;
    const videoSnap = await adminDb.collection('videos').where('videoId', '==', VideoGuid).get();
    
    if (!videoSnap.empty) {
      const videoDoc = videoSnap.docs[0];
      const videoData = videoDoc.data();
      videoTitle = videoData.title || videoTitle;
      courseId = videoData.courseId || null;

      // Update video status in Firestore
      await videoDoc.ref.update({
        processingStatus: Status === 3 ? 'ready' : (Status === 4 || Status === 5 ? 'error' : 'processing'),
        isReady: Status === 3,
        updatedAt: Date.now()
      });
    }

    // 3. Create Notification for Admins when finished (Status 3) or failed (Status 4 / 5)
    if (Status === 3) {
      await adminDb.collection('notifications').add({
        title: "🎬 Video Processing Complete!",
        message: `Your video "${videoTitle}" has finished processing in BunnyCDN and is ready to stream.`,
        type: "admin_alert",
        target: "admin",
        link: courseId ? `/course/${courseId}` : "/admin",
        timestamp: Date.now(),
        createdAt: Date.now(),
        readBy: []
      });
      console.log(`Notified admins that video ${videoTitle} (${VideoGuid}) finished processing.`);
    } else if (Status === 4 || Status === 5) {
      await adminDb.collection('notifications').add({
        title: "⚠️ Video Processing Failed",
        message: `Processing for video "${videoTitle}" on BunnyCDN encountered an error.`,
        type: "admin_alert",
        target: "admin",
        link: "/admin",
        timestamp: Date.now(),
        createdAt: Date.now(),
        readBy: []
      });
    }

    return NextResponse.json({ success: true, status: Status });
  } catch (error: any) {
    console.error("Bunny Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Allow GET for webhook health check
export async function GET() {
  return NextResponse.json({ status: "Bunny Webhook listener active" });
}
