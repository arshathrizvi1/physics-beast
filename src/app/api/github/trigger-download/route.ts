import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { sanitizePlainText, sanitizeUrl } from '@/security/sanitize';

export const POST = withZeroTrustGate(
  {
    routeId: '/api/github/trigger-download',
    rateLimitBucket: 'admin-mutation',
    requireAuth: 'teacher_or_admin',
    verifyCsrfOrigin: true,
  },
  async (request: NextRequest) => {
    try {
      const parsed = await parseAndVerifyJsonBody<Record<string, unknown>>(request);
      if (!parsed.ok) return parsed.response;

      const body = parsed.data;
      const url = sanitizeUrl(body.url);
      const password = sanitizePlainText(body.password, 128);
      const title = sanitizePlainText(body.title || 'Untitled Video', 200);
      const metadata = body.metadata;

      if (!url || !metadata || typeof metadata !== 'object') {
        return NextResponse.json({ error: 'Missing valid url or metadata' }, { status: 400 });
      }

      const githubToken = process.env.GITHUB_ACTIONS_TOKEN;
      const githubOwner = process.env.GITHUB_REPO_OWNER || 'arshathrizvi1';
      const githubRepo = process.env.GITHUB_REPO_NAME || 'physics-beast';

      if (!githubToken) {
        return NextResponse.json(
          { error: 'GITHUB_ACTIONS_TOKEN not configured in environment variables' },
          { status: 500 }
        );
      }

      const dispatchUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/dispatches`;

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
            url,
            password,
            title,
            metadata,
          },
        }),
      });

      if (!dispatchRes.ok) {
        const errText = await dispatchRes.text();
        console.error('[GitHub Trigger] Failed:', errText);
        return NextResponse.json(
          { error: 'Failed to trigger GitHub Actions' },
          { status: dispatchRes.status }
        );
      }

      await adminDb.collection('notifications').add({
        title: 'Video Download Started (GitHub Actions)',
        message: `"${title}" is downloading and transcoding into multi-quality HLS via GitHub Actions.`,
        type: 'info',
        link: '/admin',
        createdAt: Date.now(),
        isGlobal: true,
        readBy: [],
        clearedBy: [],
      });

      return NextResponse.json({
        success: true,
        message: 'GitHub Actions job triggered successfully',
      });
    } catch (error: any) {
      console.error('[GitHub Trigger] Error:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }
);
