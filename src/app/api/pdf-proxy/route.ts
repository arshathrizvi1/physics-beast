import { NextResponse } from 'next/server';
import { resolveCorsOrigin, withZeroTrustGate } from '@/security/zero-trust-gate';

export const dynamic = 'force-dynamic';

function isAllowedPdfHost(hostname: string): boolean {
  const clean = hostname.toLowerCase();
  if (
    clean === 'localhost' ||
    clean === '127.0.0.1' ||
    clean === '0.0.0.0' ||
    clean === '::1' ||
    clean === '169.254.169.254' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean) ||
    clean.endsWith('.internal') ||
    clean.endsWith('.local')
  ) {
    return false;
  }

  return (
    clean === 'brillliantacademy.site' ||
    clean === 'www.brillliantacademy.site' ||
    clean === 'brilliantacademy.site' ||
    clean === 'www.brilliantacademy.site' ||
    clean.endsWith('.r2.dev') ||
    clean.endsWith('.cloudflarestorage.com') ||
    clean === 'firebasestorage.googleapis.com' ||
    clean.endsWith('.b-cdn.net')
  );
}

export const GET = withZeroTrustGate(
  {
    scope: 'pdf_proxy',
    limit: 60,
    windowMs: 60 * 1000,
  },
  async (req: Request) => {
    const urlObj = new URL(req.url);
    const targetUrl = urlObj.searchParams.get('url');

    if (!targetUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return new NextResponse('Invalid target URL', { status: 400 });
    }

    if (parsed.protocol !== 'https:') {
      return new NextResponse('Only secure HTTPS resources are allowed', { status: 403 });
    }

    if (!isAllowedPdfHost(parsed.hostname)) {
      return new NextResponse('Forbidden: Target domain is not permitted by proxy policy', {
        status: 403,
      });
    }

    try {
      const upstreamRes = await fetch(parsed.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BrilliantAcademy/1.0',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!upstreamRes.ok) {
        return new NextResponse(`Upstream returned ${upstreamRes.status}`, {
          status: upstreamRes.status,
        });
      }

      const buffer = await upstreamRes.arrayBuffer();
      const allowedOrigin = resolveCorsOrigin(req);

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': upstreamRes.headers.get('content-type') || 'application/pdf',
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Cache-Control': 'public, max-age=86400',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (err: any) {
      return new NextResponse(err?.message || 'Proxy error', { status: 502 });
    }
  }
);
