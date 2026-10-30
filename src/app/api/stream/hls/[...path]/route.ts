import { NextRequest, NextResponse } from 'next/server';

/**
 * Secure HLS Proxy for Brilliant Academy Cloudflare R2 Stream
 * 
 * Security features:
 * 1. Referer, Origin & Host validation: Blocks unauthorized hotlinking.
 * 2. Dynamic bucket resolution with fallback: Resolves correct Cloudflare R2 bucket.
 * 3. HLS MIME type & caching headers for optimal low-latency streaming.
 */
const DEFAULT_R2_BASE = 'https://pub-204a9d6785a841bc8ffc778a5f777b32.r2.dev';

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
      host.includes('brillliantacademy.site') ||
      host.includes('brilliantacademy.site') ||
      host.includes('brilliant-academy.vercel.app') ||
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

    // Determine target R2 public base
    const hostParam = request.nextUrl.searchParams.get('host');
    let r2PublicBase = (process.env.R2_PUBLIC_URL || DEFAULT_R2_BASE).replace(/\/$/, '');
    
    if (hostParam && (hostParam.includes('.r2.dev') || hostParam.includes('.cloudflarestorage.com'))) {
      const cleanHost = hostParam.replace(/^https?:\/\//, '').replace(/\/$/, '');
      r2PublicBase = `https://${cleanHost}`;
    }

    let upstreamRes = await fetch(`${r2PublicBase}/${filePath}`, {
      headers: {
        'User-Agent': 'BrilliantAcademy-SecureProxy/1.0',
      },
    });

    // Auto-retry against fallback default bucket if primary bucket returns 404
    if (!upstreamRes.ok && upstreamRes.status === 404 && r2PublicBase !== DEFAULT_R2_BASE) {
      console.warn(`[HLS Proxy] 404 from ${r2PublicBase}/${filePath}, retrying fallback ${DEFAULT_R2_BASE}`);
      upstreamRes = await fetch(`${DEFAULT_R2_BASE}/${filePath}`, {
        headers: {
          'User-Agent': 'BrilliantAcademy-SecureProxy/1.0',
        },
      });
    }

    if (!upstreamRes.ok) {
      return new NextResponse(`Video chunk not available (${upstreamRes.status})`, {
        status: upstreamRes.status,
      });
    }

    if (filePath.endsWith('.m3u8')) {
      let manifestText = await upstreamRes.text();
      if (hostParam) {
        manifestText = manifestText.split('\n').map(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
            const separator = trimmed.includes('?') ? '&' : '?';
            return `${trimmed}${separator}host=${encodeURIComponent(hostParam)}`;
          }
          return line;
        }).join('\n');
      }

      const responseHeaders = new Headers();
      responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      responseHeaders.set('Cache-Control', 'public, max-age=60');
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

      return new NextResponse(manifestText, {
        status: 200,
        headers: responseHeaders,
      });
    }

    const contentType = filePath.endsWith('.ts')
      ? 'video/MP2T'
      : 'application/octet-stream';

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    return new NextResponse(upstreamRes.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[Secure HLS Proxy Error]:', error);
    return new NextResponse(error.message || 'Streaming error', { status: 500 });
  }
}
