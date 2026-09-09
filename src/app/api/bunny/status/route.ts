import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_STREAM_API_KEY;

    if (!libraryId || !apiKey) {
      return NextResponse.json({ error: "Bunny API keys not configured" }, { status: 500 });
    }

    const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
      headers: {
        'AccessKey': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const videoData = await res.json();

    // Bunny status mapping:
    // 0: Created, 1: Uploaded, 2: Processing, 3: Transcoding Finished (Ready), 4/5: Error
    const statusMap: Record<number, string> = {
      0: 'created',
      1: 'uploaded',
      2: 'processing',
      3: 'finished',
      4: 'error',
      5: 'failed'
    };

    return NextResponse.json({
      videoId,
      status: videoData.status,
      statusName: statusMap[videoData.status] || 'unknown',
      isReady: videoData.status === 3,
      encodeProgress: videoData.encodeProgress || 0,
      title: videoData.title
    });

  } catch (error: any) {
    console.error("Error checking Bunny video status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
