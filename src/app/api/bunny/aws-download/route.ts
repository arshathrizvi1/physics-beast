import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getServerEnv } from '@/security/env';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { sanitizeText } from '@/security/sanitize';

export const POST = withZeroTrustGate(
  {
    scope: 'bunny_aws_download',
    limit: 20,
    windowMs: 60 * 1000,
  },
  async (request, ctx) => {
    const parsed = await parseAndVerifyJsonBody<{
      url?: string;
      password?: string;
      title?: string;
      metadata?: Record<string, unknown>;
    }>(request, ctx);
    if (!parsed.ok) return parsed.response;

    const url = sanitizeText(parsed.body.url, 500);
    const password = sanitizeText(parsed.body.password || '', 128);
    const title = sanitizeText(parsed.body.title || 'Untitled Video', 200);
    const metadata = parsed.body.metadata || {};

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    const env = getServerEnv();
    const websiteUrl = process.env.WEBSITE_URL || 'https://brillliantacademy.site';

    let targetUrl = url;
    if (targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be')) {
      try {
        const u = new URL(targetUrl);
        if (u.searchParams.has('v')) {
          targetUrl = `https://www.youtube.com/watch?v=${u.searchParams.get('v')}`;
        }
      } catch {
        // Keep original URL
      }
    }

    const pipeline = (process.env.DOWNLOAD_PIPELINE || 'github').toLowerCase();
    const useAwsFirst = pipeline === 'aws';

    const githubToken = process.env.GITHUB_ACTIONS_TOKEN;
    const githubOwner = process.env.GITHUB_REPO_OWNER || 'arshathrizvi1';
    const githubRepo = process.env.GITHUB_REPO_NAME || 'physics-beast';

    if (!useAwsFirst && githubToken) {
      const dispatchUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/dispatches`;
      try {
        const dispatchRes = await fetch(dispatchUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: 'youtube-download',
            client_payload: {
              url: targetUrl,
              password,
              title,
              metadata,
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
            pipeline: 'github',
          });
        }
      } catch {
        // Fall through to AWS EC2 fallback
      }
    }

    const serverHost = process.env.NEXT_PUBLIC_RTMP_SERVER_HOST || '13.60.252.104';
    const serverPort = process.env.RTMP_HTTP_PORT || '8000';
    const callbackSecret = env.RTMP_CALLBACK_SECRET;
    const webhookUrl = `${websiteUrl}/api/bunny/aws-webhook`;
    const awsUrl = `http://${serverHost}:${serverPort}/api/generic-download`;

    try {
      const res = await fetch(awsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          password,
          title,
          metadata,
          webhookUrl,
          secret: callbackSecret,
        }),
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
      }
    } catch {
      // Unreachable
    }

    return NextResponse.json(
      {
        error:
          'Unable to start video download: neither GitHub Actions nor AWS EC2 pipeline could be reached.',
      },
      { status: 500 }
    );
  }
);
