import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, password, title, metadata } = body;

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
    const websiteUrl = process.env.WEBSITE_URL || 'https://brilliantacademy.vercel.app';

    if (isYoutube) {
      // ─── YouTube → GitHub Actions (free, fast, no IP blocking) ───────
      const githubTriggerUrl = `${websiteUrl}/api/github/trigger-download`;

      const res = await fetch(githubTriggerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title, metadata }),
      });

      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json({ error: data.error || 'GitHub trigger failed' }, { status: res.status });
      }

      return NextResponse.json(data);

    } else {
      // ─── Zoom / Other URLs → AWS EC2 ─────────────────────────────────
      const serverHost     = process.env.NEXT_PUBLIC_RTMP_SERVER_HOST || '13.60.252.104';
      const serverPort     = process.env.RTMP_HTTP_PORT || '8000';
      const callbackSecret = process.env.RTMP_CALLBACK_SECRET || 'change-me-to-a-random-string';
      const webhookUrl     = `${websiteUrl}/api/bunny/aws-webhook`;
      const awsUrl         = `http://${serverHost}:${serverPort}/api/generic-download`;

      const res = await fetch(awsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, password, title, metadata, webhookUrl, secret: callbackSecret }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: 'EC2 server error: ' + errText }, { status: res.status });
      }

      const data = await res.json();

      await adminDb.collection('notifications').add({
        title: '📹 Recording Download Started',
        message: `The AWS server is now downloading "${title}". You will be notified once it finishes uploading to BunnyCDN.`,
        type: 'info',
        link: '/admin/library',
        createdAt: Date.now(),
        isGlobal: true,
        readBy: [],
        clearedBy: [],
      });

      return NextResponse.json(data);
    }

  } catch (error: any) {
    console.error('[Download] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
