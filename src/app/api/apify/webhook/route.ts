import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Apify Webhook body:", body);

    const { datasetId, metadata, title } = body;

    if (!datasetId || !metadata) {
       return NextResponse.json({ error: 'Missing data from Apify Webhook' }, { status: 400 });
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
       return NextResponse.json({ error: 'Missing APIFY_API_TOKEN' }, { status: 500 });
    }

    // 1. Fetch the dataset items from Apify
    const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`);
    const items = await datasetRes.json();

    if (!items || items.length === 0) {
       throw new Error("No items found in Apify dataset");
    }

    const item = items[0];
    const mp4Url = item.output?.url || item.downloadUrl || item.url || item.videoUrl;

    if (!mp4Url) {
       throw new Error("No download URL found in Apify result");
    }

    // 2. Fetch it into Bunny Stream
    const websiteUrl = process.env.WEBSITE_URL || 'https://brilliantacademy.vercel.app';
    const bunnyFetchUrl = `${websiteUrl}/api/bunny/fetch`;

    const fetchRes = await fetch(bunnyFetchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: mp4Url,
        title: title || metadata.videoTitle,
      })
    });

    const fetchData = await fetchRes.json();
    if (!fetchRes.ok) {
       throw new Error("Bunny Fetch API failed: " + JSON.stringify(fetchData));
    }

    const { videoId, libraryId } = fetchData;

    // 3. Update the video document in Firestore
    const finalUrl = 'https://iframe.mediadelivery.net/embed/' + libraryId + '/' + videoId + '?autoplay=true';
    const videoRef = adminDb.collection('videos').doc(metadata.videoDocId);
    
    await videoRef.set({
      id: metadata.videoDocId,
      title: metadata.videoTitle,
      description: '',
      url: finalUrl,
      videoId: videoId,
      libraryId: libraryId,
      platform: 'bunny',
      courseId: metadata.videoCourseId === 'none' || !metadata.videoCourseId ? null : metadata.videoCourseId,
      folderId: metadata.videoFolderId,
      type: 'video',
      isReady: false, 
      processingStatus: 'transcoding', 
      updatedAt: Date.now(),
    }, { merge: true });

    // Send Notification to admins
    await adminDb.collection('notifications').add({
      title: "YouTube Video Fetched to Bunny",
      message: `The YouTube video "${metadata.videoTitle}" has been converted by Apify and is now being transcoded by BunnyCDN.`,
      type: "info",
      link: "/admin/library",
      createdAt: Date.now(),
      isGlobal: true,
      readBy: [],
      clearedBy: []
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Apify Webhook Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
