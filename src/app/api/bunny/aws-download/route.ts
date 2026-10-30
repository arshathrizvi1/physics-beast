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

    // Pipeline selection: 'github' (Serverless with PO-Token provider), 'aws' (EC2 VPS), or 'auto'
    const pipeline = (process.env.DOWNLOAD_PIPELINE || 'github').toLowerCase();
    const useAwsFirst = pipeline === 'aws';

    // ─────────────────────────────────────────────────────────────
    // 1. Primary: GitHub Actions Pipeline (Serverless + BotGuard PO-Token)
    // ─────────────────────────────────────────────────────────────
    const githubToken = process.env.GITHUB_ACTIONS_TOKEN;
    const githubOwner = process.env.GITHUB_REPO_OWNER || 'arshathrizvi1';
    const githubRepo  = process.env.GITHUB_REPO_NAME  || 'physics-beast';

    if (!useAwsFirst && githubToken) {
      const dispatchUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/dispatches`;
      console.log(`[Download] Triggering GitHub Actions dispatch: ${dispatchUrl}`);

      try {
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

        if (dispatchRes.ok) {
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
        } else {
          const errText = await dispatchRes.text();
          console.warn(`[Download] GitHub Actions dispatch returned ${dispatchRes.status}: ${errText}. Falling back to AWS EC2...`);
        }
      } catch (ghErr: any) {
        console.warn(`[Download] GitHub Actions dispatch failed (${ghErr.message}). Falling back to AWS EC2...`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Secondary / Fallback: AWS EC2 Pipeline
    // ─────────────────────────────────────────────────────────────
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
        signal: AbortSignal.timeout(8000),
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
        console.warn(`[Download] AWS EC2 returned ${res.status}: ${errText}`);
      }
    } catch (awsErr: any) {
      console.warn(`[Download] AWS EC2 server unreachable (${awsErr.message})`);
    }

    return NextResponse.json({
      error: 'Unable to start video download: neither GitHub Actions nor AWS EC2 pipeline could be reached.'
    }, { status: 500 });

  } catch (error: any) {
    console.error('[Download API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
