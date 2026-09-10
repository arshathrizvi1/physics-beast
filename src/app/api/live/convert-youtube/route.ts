import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url, streamKey, password } = await request.json();

    if (!url || !streamKey) {
      return NextResponse.json({ error: 'Missing url or streamKey' }, { status: 400 });
    }

    const serverHost = process.env.NEXT_PUBLIC_RTMP_SERVER_HOST || '13.60.252.104';
    const serverPort = process.env.RTMP_HTTP_PORT || '8000';
    const callbackSecret = process.env.RTMP_CALLBACK_SECRET || 'change-me-to-a-random-string';

    const awsUrl = 'http://' + serverHost + ':' + serverPort + '/api/convert-youtube';

    const res = await fetch(awsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        streamKey,
        password,
        secret: callbackSecret
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `AWS server error: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[Convert YouTube API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
