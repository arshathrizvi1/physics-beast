import { NextRequest, NextResponse } from 'next/server';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { sanitizePlainText, sanitizeUrl } from '@/security/sanitize';

export const POST = withZeroTrustGate(
  {
    routeId: '/api/github/upload',
    rateLimitBucket: 'admin-mutation',
    requireAuth: 'teacher_or_admin',
    verifyCsrfOrigin: true,
  },
  async (req: NextRequest) => {
    try {
      const parsed = await parseAndVerifyJsonBody<Record<string, unknown>>(req);
      if (!parsed.ok) return parsed.response;

      const videoUrl = sanitizeUrl(parsed.data.videoUrl);
      const videoId = sanitizePlainText(parsed.data.videoId, 128);
      const libraryId = sanitizePlainText(parsed.data.libraryId, 64);
      const metadata = parsed.data.metadata;

      if (!videoUrl || !videoId) {
        return NextResponse.json(
          { success: false, error: 'videoUrl and videoId are required' },
          { status: 400 }
        );
      }

      const githubPat = process.env.GITHUB_PAT;
      if (!githubPat) {
        return NextResponse.json(
          { success: false, error: 'GITHUB_PAT is not configured on the server' },
          { status: 500 }
        );
      }

      const response = await fetch(
        'https://api.github.com/repos/arshathrizvi1/physics-beast/dispatches',
        {
          method: 'POST',
          headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `token ${githubPat}`,
          },
          body: JSON.stringify({
            event_type: 'bunny-upload',
            client_payload: {
              videoUrl,
              videoId,
              libraryId,
              metadata,
            },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error('GitHub API Error:', err);
        return NextResponse.json(
          { success: false, error: 'Failed to trigger GitHub Action' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'GitHub Action started successfully',
      });
    } catch (error) {
      console.error('API Error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
);
