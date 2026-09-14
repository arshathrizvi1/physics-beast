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
      const githubToken = process.env.GITHUB_ACTIONS_TOKEN;
      const githubOwner = process.env.GITHUB_REPO_OWNER || 'arshathrizvi1';
      const githubRepo  = process.env.GITHUB_REPO_NAME  || 'physics-beast';

      if (!githubToken) {
        console.error('[Download] GITHUB_ACTIONS_TOKEN not set in Vercel env');
        return NextResponse.json({ error: 'GITHUB_ACTIONS_TOKEN not configured. Please add it to Vercel environment variables.' }, { status: 500 });
      }

      const dispatchRes = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/dispatches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: 'youtube-download',
            client_payload: { url, title, metadata },
          }),
        }
      );

      if (!dispatchRes.ok) {
        const errText = await dispatchRes.text();
        console.error('[Download] GitHub dispatch failed:', errText);
        return NextResponse.json({ error: 'Failed to trigger GitHub Actions: ' + errText }, { status: dispatchRes.status });
      }

      // Notify admin that job started
      await adminDb.collection('notifications').add({
        title: '🎬 YouTube Download Started (GitHub)',
        message: `"${title}" is being downloaded via GitHub Actions (free). You will be notified when it finishes uploading to BunnyCDN.`,
        type: 'info',
        link: '/admin/library',
        createdAt: Date.now(),
        isGlobal: true,
        readBy: [],
        clearedBy: [],
      });

      return NextResponse.json({ success: true, message: 'GitHub Actions job triggered' });

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
