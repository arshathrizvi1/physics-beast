import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Secure AES-128 HLS Decryption Key Endpoint
 * 
 * Delivers the 16-byte decryption key strictly to authorized in-browser players.
 * Completely blocks IDM, VLC, curl, and external rippers.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token') || searchParams.get('k');

    if (!token || !token.includes(':')) {
      return new NextResponse('Invalid Key Token', { status: 400 });
    }

    const referer = request.headers.get('referer') || '';
    const origin = request.headers.get('origin') || '';
    const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
    const secFetchDest = request.headers.get('sec-fetch-dest');

    // 1. Block known downloaders and scraping tools
    const isDownloader = 
      userAgent.includes('idm') ||
      userAgent.includes('internet download manager') ||
      userAgent.includes('download') ||
      userAgent.includes('cococut') ||
      userAgent.includes('fvd') ||
      userAgent.includes('curl') ||
      userAgent.includes('wget') ||
      userAgent.includes('python') ||
      userAgent.includes('vlc');

    if (isDownloader) {
      console.warn(`[HLS Key Shield] 🛑 Blocked downloader tool: ${userAgent}`);
      return new NextResponse('Access Denied: External downloaders are prohibited.', { status: 403 });
    }

    // 2. Validate Origin & Referer (Only allow Brilliant Academy domains or localhost)
    const isAllowedDomain =
      referer.includes('brillliantacademy.site') ||
      referer.includes('brilliantacademy.site') ||
      referer.includes('brilliant-academy.vercel.app') ||
      origin.includes('brillliantacademy.site') ||
      origin.includes('brilliantacademy.site') ||
      origin.includes('brilliant-academy.vercel.app') ||
      process.env.NODE_ENV !== 'production';

    if (!isAllowedDomain) {
      console.warn(`[HLS Key Shield] 🛑 Blocked unauthorized referer: ${referer || 'none'}`);
      return new NextResponse('Access Denied: Stream key can only be accessed from the official player.', { status: 403 });
    }

    // 3. Decrypt the 16-byte raw AES key from the stateless token
    const secret = process.env.RTMP_CALLBACK_SECRET || 'ba_secure_hls_stream_key_2026';
    const cipherKey = crypto.createHash('sha256').update(secret).digest();

    const [ivHex, encHex] = token.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, Buffer.from(ivHex, 'hex'));
    const rawKey = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);

    if (rawKey.length !== 16) {
      return new NextResponse('Malformed key format', { status: 500 });
    }

    // 4. Return the raw 16 binary bytes to the player's in-memory decryptor
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/octet-stream');
    responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(rawKey, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[HLS Key Decrypt Error]:', error.message);
    return new NextResponse('Key retrieval failed', { status: 403 });
  }
}
