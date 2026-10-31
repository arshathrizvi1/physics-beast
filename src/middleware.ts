import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANARY_TRAP_PATHS = new Set([
  '/wp-admin',
  '/wp-login.php',
  '/.env',
  '/.env.local',
  '/phpmyadmin',
  '/api/v1/internal/config',
]);

const WEBHOOK_BYPASS_PREFIXES = [
  '/api/bunny/webhook',
  '/api/bunny/aws-webhook',
  '/api/zoom/webhook',
  '/api/apify/webhook',
  '/api/live/rtmp-callback',
];

const ALLOWED_ORIGINS = new Set([
  'https://brillliantacademy.site',
  'https://www.brillliantacademy.site',
  'https://brilliantacademy.site',
  'https://www.brilliantacademy.site',
  'https://brilliant-academy.vercel.app',
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  // 1. Block source map harvesting in production
  if (pathname.endsWith('.map')) {
    return new NextResponse(null, { status: 404 });
  }

  // 2. Active Deception Canary Trap Paths
  if (CANARY_TRAP_PATHS.has(pathname.toLowerCase())) {
    const traceId = crypto.randomUUID();
    return NextResponse.json(
      { ok: false, error: 'ERR_REQ_REJECTED', code: 'ERR_REQ_REJECTED', traceId },
      { status: 403 }
    );
  }

  // 3. CSRF Origin / Host verification on state-mutating API calls
  const isWebhook = WEBHOOK_BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (
    pathname.startsWith('/api/') &&
    !isWebhook &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
  ) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');

    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        const isTrustedOrigin =
          originUrl.host === host ||
          ALLOWED_ORIGINS.has(origin) ||
          originUrl.hostname.endsWith('.vercel.app') ||
          originUrl.hostname.endsWith('.brillliantacademy.site') ||
          originUrl.hostname.endsWith('.brilliantacademy.site') ||
          originUrl.hostname === 'localhost' ||
          originUrl.hostname === '127.0.0.1';

        if (!isTrustedOrigin) {
          return NextResponse.json(
            {
              ok: false,
              error: 'ERR_REQ_REJECTED',
              code: 'ERR_CSRF_ORIGIN_MISMATCH',
              traceId: crypto.randomUUID(),
            },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          {
            ok: false,
            error: 'ERR_REQ_REJECTED',
            code: 'ERR_MALFORMED_ORIGIN',
            traceId: crypto.randomUUID(),
          },
          { status: 400 }
        );
      }
    }
  }

  // 4. Generate dynamic per-request CSP nonce
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = btoa(String.fromCharCode(...Array.from(nonceBytes)));

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  res.headers.set('x-nonce', nonce);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(), payment=(self), usb=(), browsing-topics=()'
  );
  res.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  res.headers.delete('X-Powered-By');
  res.headers.delete('Server');

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
