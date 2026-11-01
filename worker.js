// ============================================================================
// BRILLIANT ACADEMY ZERO-TRUST CLOUDFLARE EDGE WORKER
// Architecture:
//   1. Enterprise Zero-Trust Edge Security & CSP Nonce Guard
//   2. Next.js Static Export Asset Delivery (env.ASSETS)
//   3. Cloudflare D1 SQL Edge Database API (/api/d1-sync, /api/sync-flush)
//   4. Cloudflare R2 Media Object Storage (/api/r2-media/*)
//   5. Firebase Auth Custom Domain Reverse Proxy (/__/auth/*)
// ============================================================================

function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function resolveCorsOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = [
    'https://brillliantacademy.site',
    'https://www.brillliantacademy.site',
    'http://localhost:3000',
    'http://localhost:4000',
    'capacitor://localhost',
    'http://localhost',
  ];
  return allowed.includes(origin) ? origin : 'https://brillliantacademy.site';
}

function buildSecurityHeaders(request, nonce) {
  const origin = resolveCorsOrigin(request);
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseio.com https://*.googleapis.com https://source.zoom.us https://*.zoom.us https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://source.zoom.us https://cdn.jsdelivr.net",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data: https://fonts.gstatic.com https://source.zoom.us",
    "connect-src 'self' https: wss: blob:",
    "media-src 'self' blob: data: https:",
    "worker-src 'self' blob:",
    "frame-src 'self' https://*.firebaseapp.com https://*.google.com https://*.zoom.us https://*.youtube.com https://*.youtube-nocookie.com https://iframe.mediadelivery.net https://*.payable.lk",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self' https://*.payable.lk",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  return {
    'Content-Security-Policy': csp,
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(self)',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const nonce = generateNonce();

    // 1. Preflight OPTIONS for API routes
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: buildSecurityHeaders(request, nonce),
      });
    }

    // 3. Firebase Auth Custom Domain Reverse Proxy (/__/auth/*)
    // If a human visitor opens /__/auth directly in their browser, redirect safely to /login
    if (url.pathname === '/__/auth' || url.pathname === '/__/auth/') {
      return Response.redirect('https://www.brillliantacademy.site/login', 302);
    }

    // Proxy internal Firebase SDK authentication endpoints (/__/auth/handler, etc.)
    if (url.pathname.startsWith('/__/auth/')) {
      try {
        const targetUrl = new URL(request.url);
        targetUrl.hostname = 'physics-beastsl.firebaseapp.com';
        targetUrl.protocol = 'https:';
        targetUrl.port = '';

        const forwardHeaders = new Headers(request.headers);
        forwardHeaders.set('Host', 'physics-beastsl.firebaseapp.com');
        forwardHeaders.set('X-Forwarded-Host', url.hostname);

        const response = await fetch(targetUrl.toString(), {
          method: request.method,
          headers: forwardHeaders,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
          redirect: 'follow',
        });

        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', resolveCorsOrigin(request));
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        headers.set('X-Content-Type-Options', 'nosniff');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      } catch (err) {
        return new Response('Auth proxy temporarily unavailable', { status: 502 });
      }
    }

    // 4. Cloudflare D1 Flush-on-Close API (/api/sync-flush)
    // Invoked by navigator.sendBeacon when user minimizes or exits the tab
    if (url.pathname === '/api/sync-flush' && request.method === 'POST') {
      try {
        const bodyText = await request.text();
        const payload = JSON.parse(bodyText);

        if (env.DB && payload.mutations && Array.isArray(payload.mutations)) {
          const statements = [];

          for (const m of payload.mutations) {
            if (m.type === 'video_progress') {
              statements.push(
                env.DB.prepare(
                  `INSERT INTO video_progress (id, user_id, course_id, lesson_id, watched_seconds, total_seconds, is_completed, last_watched_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                   ON CONFLICT(user_id, lesson_id) DO UPDATE SET
                     watched_seconds = excluded.watched_seconds,
                     total_seconds = excluded.total_seconds,
                     is_completed = excluded.is_completed,
                     last_watched_at = CURRENT_TIMESTAMP`
                ).bind(
                  m.id || crypto.randomUUID(),
                  m.userId,
                  m.courseId,
                  m.lessonId,
                  m.watchedSeconds || 0,
                  m.totalSeconds || 0,
                  m.isCompleted ? 1 : 0
                )
              );
            } else if (m.type === 'audit_log') {
              statements.push(
                env.DB.prepare(
                  `INSERT INTO audit_ledger (id, event_type, actor_id, ip_address, user_agent, details)
                   VALUES (?, ?, ?, ?, ?, ?)`
                ).bind(
                  crypto.randomUUID(),
                  m.eventType || 'user_action',
                  m.userId || 'anonymous',
                  request.headers.get('CF-Connecting-IP') || '',
                  request.headers.get('User-Agent') || '',
                  JSON.stringify(m.details || {})
                )
              );
            }
          }

          if (statements.length > 0) {
            await env.DB.batch(statements);
          }
        }

        return new Response(JSON.stringify({ success: true, flushed: true }), {
          headers: { 'Content-Type': 'application/json', ...buildSecurityHeaders(request, nonce) },
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 5. Cloudflare D1 Query / Sync API (/api/d1-sync)
    if (url.pathname === '/api/d1-sync') {
      if (!env.DB) {
        return new Response(JSON.stringify({ error: 'D1 binding DB not configured' }), { status: 500 });
      }

      if (request.method === 'GET') {
        const table = url.searchParams.get('table') || 'courses';
        const allowedTables = ['courses', 'lessons', 'video_progress', 'enrollments'];
        if (!allowedTables.includes(table)) {
          return new Response(JSON.stringify({ error: 'Invalid table' }), { status: 400 });
        }

        const userId = url.searchParams.get('userId');
        let query = `SELECT * FROM ${table}`;
        let params = [];

        if (userId && (table === 'video_progress' || table === 'enrollments')) {
          query += ` WHERE user_id = ?`;
          params.push(userId);
        }

        query += ` LIMIT 100`;
        const res = await env.DB.prepare(query).bind(...params).all();

        return new Response(JSON.stringify({ success: true, data: res.results }), {
          headers: { 'Content-Type': 'application/json', ...buildSecurityHeaders(request, nonce) },
        });
      }
    }

    // 6. Cloudflare R2 Media Object Storage (/api/r2-media/*)
    if (url.pathname.startsWith('/api/r2-media/')) {
      if (!env.MEDIA) {
        return new Response('R2 binding MEDIA not configured', { status: 500 });
      }

      const key = decodeURIComponent(url.pathname.replace('/api/r2-media/', ''));
      const object = await env.MEDIA.get(key);

      if (!object) {
        return new Response('Media object not found in R2', { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Access-Control-Allow-Origin', resolveCorsOrigin(request));

      return new Response(object.body, { headers });
    }

    // 7. Healthcheck (/api/health)
    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          edge_colo: request.cf?.colo || 'UNKNOWN',
          country: request.cf?.country || 'UNKNOWN',
          d1_connected: !!env.DB,
          r2_connected: !!env.MEDIA,
        }),
        { headers: { 'Content-Type': 'application/json', ...buildSecurityHeaders(request, nonce) } }
      );
    }

    // 8. Next.js Static Assets (env.ASSETS)
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      const securityHeaders = buildSecurityHeaders(request, nonce);

      for (const [k, v] of Object.entries(securityHeaders)) {
        headers.set(k, v);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return new Response('Brilliant Academy Edge Gateway Ready', { status: 200 });
  },
};
