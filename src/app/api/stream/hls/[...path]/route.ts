import { NextRequest, NextResponse } from 'next/server';

/**
 * Secure HLS Proxy for Brilliant Academy Cloudflare R2 Stream
 * 
 * Security features:
 * 1. Referer & Origin validation: Blocks hotlinking and outside playback (VLC, foreign players, third-party sites).
 * 2. URL obfuscation: Hides the underlying Cloudflare R2 bucket domain from the browser DOM.
 * 3. HLS MIME type & aggressive caching headers for optimal performance.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const referer = request.headers.get('referer') || '';
    const origin = request.headers.get('origin') || '';
    const host = request.headers.get('host') || '';

    // Allow requests originating from Brilliant Academy domains or local development
    const isAllowedDomain = 
      referer.includes('brillliantacademy.site') ||
      referer.includes('brilliantacademy.site') ||
      referer.includes('brilliant-academy.vercel.app') ||
      origin.includes('brillliantacademy.site') ||
      origin.includes('brilliantacademy.site') ||
      origin.includes('brilliant-academy.vercel.app') ||
      host.includes('localhost') ||
      process.env.NODE_ENV !== 'production';

    if (!isAllowedDomain) {
      return new NextResponse(
        'Access Denied: Playback outside the official Brilliant Academy video player is prohibited.',
        { status: 403 }
      );
    }

    const filePath = path && path.length > 0 ? path.join('/') : '';
    if (!filePath) {
      return new NextResponse('Bad Request: File path missing', { status: 400 });
    }

    const r2PublicBase = (process.env.R2_PUBLIC_URL || 'https://pub-108b7e0d0cbb4f1ab3fbb196a4999283.r2.dev').replace(/\/$/, '');
    const upstreamUrl = `${r2PublicBase}/${filePath}`;

    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        'User-Agent': 'BrilliantAcademy-SecureProxy/1.0',
      },
    });

    if (!upstreamRes.ok) {
      return new NextResponse(`Video chunk not available (${upstreamRes.status})`, {
        status: upstreamRes.status,
      });
    }

    const contentType = filePath.endsWith('.m3u8')
      ? 'application/vnd.apple.mpegurl'
      : filePath.endsWith('.ts')
      ? 'video/MP2T'
      : 'application/octet-stream';

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Cache-Control', filePath.endsWith('.m3u8') ? 'public, max-age=60' : 'public, max-age=31536000, immutable');
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(upstreamRes.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[Secure HLS Proxy Error]:', error);
    return new NextResponse(error.message || 'Streaming error', { status: 500 });
  }
}
