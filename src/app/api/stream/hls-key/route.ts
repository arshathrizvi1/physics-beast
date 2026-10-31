import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerEnv } from '@/security/env';
import { resolveCorsOrigin } from '@/security/zero-trust-gate';

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
      return new NextResponse('Access Denied: External downloaders are prohibited.', {
        status: 403,
      });
    }

    const isAllowedDomain =
      referer.includes('brillliantacademy.site') ||
      referer.includes('brilliantacademy.site') ||
      referer.includes('brilliant-academy.vercel.app') ||
      origin.includes('brillliantacademy.site') ||
      origin.includes('brilliantacademy.site') ||
      origin.includes('brilliant-academy.vercel.app') ||
      process.env.NODE_ENV !== 'production';

    if (!isAllowedDomain) {
      return new NextResponse(
        'Access Denied: Stream key can only be accessed from the official player.',
        { status: 403 }
      );
    }

    const env = getServerEnv();
    const secret = env.RTMP_CALLBACK_SECRET;
    const cipherKey = crypto.createHash('sha256').update(secret).digest();

    const [ivHex, encHex] = token.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      cipherKey,
      Buffer.from(ivHex, 'hex')
    );
    const rawKey = Buffer.concat([
      decipher.update(Buffer.from(encHex, 'hex')),
      decipher.final(),
    ]);

    if (rawKey.length !== 16) {
      return new NextResponse('Malformed key format', { status: 500 });
    }

    const allowedOrigin = resolveCorsOrigin(request);
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/octet-stream');
    responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    responseHeaders.set('Access-Control-Allow-Origin', allowedOrigin);

    return new NextResponse(rawKey, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[HLS Key Decrypt Error]:', error.message);
    return new NextResponse('Key retrieval failed', { status: 403 });
  }
}
