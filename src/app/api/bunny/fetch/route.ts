import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url, title, zoomPassword } = await request.json();
    
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_STREAM_API_KEY;

    if (!libraryId || !apiKey) {
      return NextResponse.json({ error: 'Bunny API keys not configured. Please add BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY to your .env.local' }, { status: 500 });
    }

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Process Zoom URLs if password is provided
    let finalFetchUrl = url;
    if (zoomPassword && url.includes('zoom.us')) {
      const separator = finalFetchUrl.includes('?') ? '&' : '?';
      finalFetchUrl = `${finalFetchUrl}${separator}pwd=${encodeURIComponent(zoomPassword)}`;
    }

    // 1. Create a video object first
    const createRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
      method: 'POST',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ title: title || 'Zoom Recording' })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return NextResponse.json({ error: `Failed to create video for fetch: ${errText}` }, { status: createRes.status });
    }

    const videoData = await createRes.json();
    const videoId = videoData.guid;

    // 2. Fetch the video from the provided URL
    const fetchRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}/fetch`, {
      method: 'POST',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ url: finalFetchUrl })
    });

    if (!fetchRes.ok) {
      const errText = await fetchRes.text();
      return NextResponse.json({ error: `Failed to fetch video from URL: ${errText}` }, { status: fetchRes.status });
    }

    return NextResponse.json({ success: true, videoId, libraryId });

  } catch (error: any) {
    console.error("Bunny Fetch API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
