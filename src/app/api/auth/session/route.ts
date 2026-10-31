import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyCaller } from '@/lib/livekitServer';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  clearAdminSessionCookie,
  getAuthenticatedCaller,
} from '@/security/session';
import { computeRequestFingerprint } from '@/security/rate-limit';
import { appendAuditLog } from '@/security/audit-ledger';
import { withZeroTrustGate } from '@/security/zero-trust-gate';
import { getServerEnv } from '@/security/env';

/**
 * POST /api/auth/session
 * Exchanges a verified Admin/Teacher Firebase ID token for a 30-minute
 * hardware-bound HttpOnly, SameSite=Strict session cookie (`ba_admin_session`).
 */
export const POST = withZeroTrustGate(
  { scope: 'auth_session_issue', limit: 15, windowMs: 60 * 1000 },
  async (req, ctx) => {
    const caller = await verifyCaller(req);
    if (!caller || !caller.isAdmin) {
      await appendAuditLog({
        traceId: ctx.traceId,
        severity: 'WARN',
        eventType: 'ADMIN_LOGIN_FAILURE',
        ip: ctx.ip,
        fingerprint: ctx.fingerprint,
        path: '/api/auth/session',
        method: 'POST',
        details: { email: caller?.email || 'unauthenticated' },
      });
      return NextResponse.json(
        { ok: false, error: 'Unauthorized: Admin or Teacher account required.' },
        { status: 401 }
      );
    }

    const env = getServerEnv();
    const fp = computeRequestFingerprint(req);
    const role = caller.role === 'teacher' ? 'teacher' : 'admin';
    const sessionToken = createSessionToken(caller.email, fp, role);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });

    await appendAuditLog({
      traceId: ctx.traceId,
      severity: 'INFO',
      eventType: 'ADMIN_LOGIN_SUCCESS',
      ip: ctx.ip,
      fingerprint: ctx.fingerprint,
      path: '/api/auth/session',
      method: 'POST',
      details: { email: caller.email, role },
    });

    return NextResponse.json({
      ok: true,
      email: caller.email,
      role,
      expiresInSeconds: Math.floor(SESSION_TTL_MS / 1000),
    });
  }
);

/**
 * GET /api/auth/session
 * Verifies the active session or Bearer token.
 */
export const GET = withZeroTrustGate(
  { scope: 'auth_session_verify', limit: 60, windowMs: 60 * 1000 },
  async (req) => {
    const caller = await getAuthenticatedCaller(req);
    if (!caller) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({
      authenticated: true,
      email: caller.email,
      role: caller.role,
      isAdmin: caller.isAdmin,
    });
  }
);

/**
 * DELETE /api/auth/session
 * Revokes JTI and clears the HttpOnly session cookie on logout.
 */
export const DELETE = withZeroTrustGate(
  { scope: 'auth_session_revoke', limit: 30, windowMs: 60 * 1000 },
  async () => {
    await clearAdminSessionCookie();
    return NextResponse.json({ ok: true });
  }
);
