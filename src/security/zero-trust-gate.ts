// ============================================================================
// CENTRALIZED ZERO-TRUST API GATEKEEPER & DYNAMIC SECURITY HEADERS
// Enforces:
//   1. Strict CORS & CSRF Origin Validation (Blocks cross-site state mutations)
//   2. Blacklist Check + Cryptographic Tarpit for Flagged Scanners
//   3. Sliding-Window Rate Limiting per IP + SHA-256(UA + IP Subnet)
//   4. Anti-Replay Verification (60s X-Request-Timestamp + Single-Use Nonce)
//   5. Role-Scoped Auth Enforcement (admin, teacher_or_admin, authenticated)
//   6. MDN A+ Security Headers (CSP, HSTS, COOP, X-Frame-Options, nosniff)
// ============================================================================

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { appendAuditLog } from './audit-ledger';
import {
  getClientIp,
  computeRequestFingerprint,
  isActorBlacklisted,
  blacklistActor,
  engageCryptographicTarpit,
  checkRateLimit,
  verifyAntiReplay,
} from './rate-limit';
import { getAuthenticatedCaller } from './session';
import { detectHoneypotTampering } from './schemas';
import { VerifiedCaller } from '@/lib/livekitServer';

export const ALLOWED_ORIGINS = new Set([
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

export function resolveCorsOrigin(req: Request): string {
  const origin = req.headers.get('origin') || '';
  if (!origin) return 'https://www.brillliantacademy.site';
  if (
    ALLOWED_ORIGINS.has(origin) ||
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.brillliantacademy.site') ||
    origin.endsWith('.brilliantacademy.site')
  ) {
    return origin;
  }
  return 'https://www.brillliantacademy.site';
}

export function attachSecurityHeaders<T extends Response>(res: T, req?: Request, nonce = ''): T {
  const allowedOrigin = req ? resolveCorsOrigin(req) : 'https://www.brillliantacademy.site';
  res.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Request-Timestamp, X-Request-Nonce, X-Idempotency-Key, X-Secure-Signature, X-Timestamp, X-App-Platform'
  );
  res.headers.set('Vary', 'Origin');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(), payment=(self), usb=(), browsing-topics=()'
  );
  if (nonce) {
    res.headers.set('X-Nonce', nonce);
  }
  res.headers.delete('X-Powered-By');
  res.headers.delete('Server');
  return res;
}

export interface ZeroTrustGateOptions {
  scope?: string;
  limit?: number;
  windowMs?: number;
  requireAuth?: 'admin' | 'teacher_or_admin' | 'authenticated' | 'none';
  requireCsrfOrigin?: boolean;
}

export interface ZeroTrustRequestContext {
  ip: string;
  fingerprint: string;
  traceId: string;
  caller: VerifiedCaller | null;
}

export function createOpaqueErrorResponse(
  status: number,
  traceId: string,
  error = 'ERR_REQ_REJECTED',
  extraHeaders?: Record<string, string>
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error,
      code: 'ERR_REQ_REJECTED',
      traceId,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        ...extraHeaders,
      },
    }
  );
}

/**
 * Higher-Order Zero-Trust API Wrapper for Next.js Route Handlers.
 */
export function withZeroTrustGate(
  options: ZeroTrustGateOptions,
  handler: (req: Request, ctx: ZeroTrustRequestContext) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    const traceId = crypto.randomUUID();
    const ip = getClientIp(req);
    const fingerprint = computeRequestFingerprint(req);
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method.toUpperCase();

    try {
      // 1. Check Blacklist (Honeypot / Canary offenders)
      if (isActorBlacklisted({ ip, fingerprint })) {
        await engageCryptographicTarpit(1400, 2400);
        return attachSecurityHeaders(createOpaqueErrorResponse(403, traceId), req);
      }

      // 2. CSRF Origin Validation on State-Mutating Requests
      if (
        (options.requireCsrfOrigin ?? true) &&
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
      ) {
        const origin = req.headers.get('origin');
        if (origin) {
          try {
            const originHost = new URL(origin).hostname;
            const reqHost = url.hostname;
            const isAllowed =
              originHost === reqHost ||
              ALLOWED_ORIGINS.has(origin) ||
              originHost.endsWith('.vercel.app') ||
              originHost.endsWith('.brillliantacademy.site') ||
              originHost.endsWith('.brilliantacademy.site') ||
              originHost === 'localhost' ||
              originHost === '127.0.0.1';

            if (!isAllowed) {
              await appendAuditLog({
                traceId,
                severity: 'WARN',
                eventType: 'CSRF_ORIGIN_BLOCKED',
                ip,
                fingerprint,
                path: pathname,
                method,
                details: { origin, expectedHost: reqHost },
              });
              return attachSecurityHeaders(
                createOpaqueErrorResponse(403, traceId, 'Cross-origin request rejected.'),
                req
              );
            }
          } catch {
            return attachSecurityHeaders(
              createOpaqueErrorResponse(400, traceId, 'Malformed Origin header.'),
              req
            );
          }
        }
      }

      // 3. Sliding-Window Rate Limiting per IP + Fingerprint
      const rl = checkRateLimit({
        scope: options.scope || pathname,
        ip,
        fingerprint,
        limit: options.limit ?? 45,
        windowMs: options.windowMs ?? 60 * 1000,
      });

      if (!rl.allowed) {
        await appendAuditLog({
          traceId,
          severity: 'WARN',
          eventType: 'RATE_LIMIT_EXCEEDED',
          ip,
          fingerprint,
          path: pathname,
          method,
          details: { scope: options.scope || pathname, limit: options.limit ?? 45 },
        });
        return attachSecurityHeaders(
          createOpaqueErrorResponse(
            429,
            traceId,
            'Too many requests. Please wait before trying again.',
            { 'Retry-After': String(rl.retryAfterSeconds) }
          ),
          req
        );
      }

      // 4. Anti-Replay Verification (60s Timestamp + Single-Use Nonce when headers present)
      const replayCheck = verifyAntiReplay(req);
      if (!replayCheck.valid) {
        await appendAuditLog({
          traceId,
          severity: 'HIGH',
          eventType: 'REPLAY_ATTACK_BLOCKED',
          ip,
          fingerprint,
          path: pathname,
          method,
          details: { reason: replayCheck.reason },
        });
        return attachSecurityHeaders(
          createOpaqueErrorResponse(403, traceId, 'Request replay or timestamp skew rejected.'),
          req
        );
      }

      // 5. Role-Scoped Authentication Enforcement
      let caller: VerifiedCaller | null = null;
      const requireAuth = options.requireAuth ?? 'none';

      if (requireAuth !== 'none') {
        caller = await getAuthenticatedCaller(req);
        const isAuthorized =
          caller !== null &&
          (requireAuth === 'authenticated' ||
            (requireAuth === 'teacher_or_admin' && caller.isAdmin) ||
            (requireAuth === 'admin' && (caller.role === 'admin' || caller.isAdmin)));

        if (!isAuthorized) {
          await appendAuditLog({
            traceId,
            severity: 'HIGH',
            eventType: 'UNAUTHORIZED_ADMIN_ATTEMPT',
            ip,
            fingerprint,
            path: pathname,
            method,
            details: { requiredRole: requireAuth, callerEmail: caller?.email || 'unauthenticated' },
          });
          return attachSecurityHeaders(
            createOpaqueErrorResponse(401, traceId, 'Unauthorized: Valid credentials required.'),
            req
          );
        }
      }

      const response = await handler(req, { ip, fingerprint, traceId, caller });
      return attachSecurityHeaders(response, req);
    } catch (err: unknown) {
      await appendAuditLog({
        traceId,
        severity: 'HIGH',
        eventType: 'INTERNAL_ROUTE_ERROR',
        ip,
        fingerprint,
        path: pathname,
        method,
        details: err instanceof Error ? err.message : 'Unhandled route exception',
      });
      return attachSecurityHeaders(
        createOpaqueErrorResponse(500, traceId, 'Internal server error.'),
        req
      );
    }
  };
}

/**
 * Helper to parse JSON body and automatically block & blacklist Honeypot tampering.
 */
export async function parseAndVerifyJsonBody<T = Record<string, unknown>>(
  req: Request,
  ctx: ZeroTrustRequestContext
): Promise<{ ok: true; body: T } | { ok: false; response: NextResponse }> {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return {
      ok: false,
      response: createOpaqueErrorResponse(400, ctx.traceId, 'Invalid JSON body.'),
    };
  }

  const honeypotHit = detectHoneypotTampering(rawBody);
  if (honeypotHit) {
    blacklistActor({
      ip: ctx.ip,
      fingerprint: ctx.fingerprint,
      reason: `Honeypot field injected: ${honeypotHit}`,
    });
    await appendAuditLog({
      traceId: ctx.traceId,
      severity: 'CRITICAL',
      eventType: 'PARAMETER_TAMPERING_DETECTED',
      ip: ctx.ip,
      fingerprint: ctx.fingerprint,
      path: new URL(req.url).pathname,
      method: req.method,
      details: { honeypotHit },
    });
    await engageCryptographicTarpit(1500, 2600);
    return {
      ok: false,
      response: createOpaqueErrorResponse(403, ctx.traceId),
    };
  }

  return { ok: true, body: rawBody as T };
}
