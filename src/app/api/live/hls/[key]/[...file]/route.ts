import { NextRequest, NextResponse } from 'next/server';

/**
 * HTTPS HLS Proxy for RTMP Stream
 * 
 * Securely proxies HLS video streams from the AWS RTMP server over HTTPS,
 * preventing browser "Mixed Content" security blocks.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string; file: string[] }> }
) {
  try {
    const { key, file } = await context.params;
    const filePath = file && file.length > 0 ? file.join('/') : 'index.m3u8';

    const host = process.env.NEXT_PUBLIC_RTMP_SERVER_HOST || '13.60.252.104';
    const port = process.env.NEXT_PUBLIC_RTMP_HTTP_PORT || '8000';

    const targetUrl = `http://${host}:${port}/live/${key}/${filePath}`;

    const upstreamRes = await fetch(targetUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store',
      }
    });

    if (!upstreamRes.ok) {
      return new NextResponse(`Segment not ready or stream ended (${upstreamRes.status})`, { 
        status: upstreamRes.status 
      });
    }

    const contentType = filePath.endsWith('.m3u8')
      ? 'application/vnd.apple.mpegurl'
      : filePath.endsWith('.ts')
      ? 'video/MP2T'
      : 'application/octet-stream';

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    return new NextResponse(upstreamRes.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[HLS Proxy] Error:', error);
    return new NextResponse(error.message || 'Stream proxy error', { status: 502 });
  }
}
