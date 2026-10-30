import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, password, title, metadata } = body;

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    const websiteUrl = process.env.WEBSITE_URL || 'https://brillliantacademy.site';

    // Normalize YouTube URL if needed
    let targetUrl = url;
    if (targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be')) {
      try {
        const u = new URL(targetUrl);
        if (u.searchParams.has('v')) {
          targetUrl = `https://www.youtube.com/watch?v=${u.searchParams.get('v')}`;
        }
      } catch (e) {}
    }

    // Pipeline selection: 'auto' (smart hybrid), 'aws' (EC2 VPS), or 'github' (Serverless)
    // - YouTube URLs route through AWS EC2 by default to bypass datacenter IP restrictions
    // - Zoom URLs route through GitHub Actions serverless pipeline
    const pipeline = (process.env.DOWNLOAD_PIPELINE || 'auto').toLowerCase();
    const isYoutube = targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be');
    const useAws = pipeline === 'aws' || (pipeline === 'auto' && isYoutube);

    // ─────────────────────────────────────────────────────────────
    // 1. AWS EC2 Pipeline (Primary for YouTube / High reliability)
    // ─────────────────────────────────────────────────────────────
    if (useAws) {
      const serverHost     = process.env.NEXT_PUBLIC_RTMP_SERVER_HOST || '13.60.252.104';
      const serverPort     = process.env.RTMP_HTTP_PORT || '8000';
      const callbackSecret = process.env.RTMP_CALLBACK_SECRET || 'change-me-to-a-random-string';
      const webhookUrl     = `${websiteUrl}/api/bunny/aws-webhook`;
      const awsUrl         = `http://${serverHost}:${serverPort}/api/generic-download`;

      console.log(`[Download] Routing to AWS EC2 server: ${awsUrl}`);

      try {
        const res = await fetch(awsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl, password, title, metadata, webhookUrl, secret: callbackSecret }),
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const data = await res.json();
          await adminDb.collection('notifications').add({
            title: '🎥 Recording Download Started (AWS)',
            message: `The EC2 proxy is now downloading "${title}". You will be notified once it finishes uploading.`,
            type: 'info',
            link: '/admin',
            createdAt: Date.now(),
            isGlobal: true,
            readBy: [],
            clearedBy: [],
          });
          return NextResponse.json(data);
        } else {
          const errText = await res.text();
          console.warn(`[Download] AWS EC2 returned ${res.status}: ${errText}. Falling back to GitHub Actions...`);
        }
      } catch (awsErr: any) {
        console.warn(`[Download] AWS EC2 server unreachable (${awsErr.message}). Automatically falling back to GitHub Actions Pipeline...`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. GitHub Actions Pipeline (Option 1: Free Serverless R2 HLS)
    // ─────────────────────────────────────────────────────────────
    const githubToken = process.env.GITHUB_ACTIONS_TOKEN;
    const githubOwner = process.env.GITHUB_REPO_OWNER || 'arshathrizvi1';
    const githubRepo  = process.env.GITHUB_REPO_NAME  || 'physics-beast';

    if (!githubToken) {
      console.warn('[Download] GITHUB_ACTIONS_TOKEN not set in environment.');
      return NextResponse.json({
        error: 'GITHUB_ACTIONS_TOKEN is not configured in your website environment variables. Please add GITHUB_ACTIONS_TOKEN to your .env.local / Vercel / Cloudflare variables, or set DOWNLOAD_PIPELINE=aws to continue using the AWS server.'
      }, { status: 500 });
    }

    const dispatchUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/dispatches`;
    console.log(`[Download] Triggering GitHub Actions dispatch: ${dispatchUrl}`);

    const dispatchRes = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'youtube-download',
        client_payload: {
          url: targetUrl,
          password: password || '',
          title: title || 'Untitled Video',
          metadata: metadata || {},
        },
      }),
    });

    if (!dispatchRes.ok) {
      const errText = await dispatchRes.text();
      console.error('[GitHub Actions Trigger Failed]:', errText);
      return NextResponse.json({
        error: `Failed to trigger GitHub Actions (${dispatchRes.status}): ${errText}`
      }, { status: dispatchRes.status });
    }

    await adminDb.collection('notifications').add({
      title: '🎬 Video Download Started (GitHub Actions)',
      message: `"${title}" is downloading and transcoding into multi-quality HLS for Cloudflare R2 / Bunny via GitHub Actions.`,
      type: 'info',
      link: '/admin',
      createdAt: Date.now(),
      isGlobal: true,
      readBy: [],
      clearedBy: [],
    });

    return NextResponse.json({
      success: true,
      message: 'GitHub Actions video pipeline triggered successfully',
      pipeline: 'github'
    });

  } catch (error: any) {
    console.error('[Download API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
