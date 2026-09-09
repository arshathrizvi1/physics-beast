import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { title } = await request.json();
    
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_STREAM_API_KEY;

    if (!libraryId || !apiKey) {
      return NextResponse.json({ error: 'Bunny API keys not configured. Please add BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY to your .env.local' }, { status: 500 });
    }

    const createRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
      method: 'POST',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ title: title || 'Untitled Video' })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return NextResponse.json({ error: `Failed to create video: ${errText}` }, { status: createRes.status });
    }

    const videoData = await createRes.json();
    const videoId = videoData.guid;

    const expirationTime = Math.floor(Date.now() / 1000) + 3600;
    const signatureStr = `${libraryId}${apiKey}${expirationTime}${videoId}`;
    const signature = crypto.createHash('sha256').update(signatureStr).digest('hex');

    return NextResponse.json({
      videoId,
      libraryId,
      signature,
      expirationTime
    });

  } catch (error: any) {
    console.error("Bunny API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
