// ============================================================================
// HARDWARE-BOUND ADMIN SESSION & FIREBASE ID TOKEN AUTHORITY
// Enforces:
//   - 30-Minute (1,800s) HttpOnly, SameSite=Strict, Secure Admin Session Tokens
//   - SHA-256(User-Agent | IP Subnet) Device Fingerprint Binding (Anti-Hijack)
//   - JTI Revocation Blacklist on Logout or Fingerprint Mismatch
//   - Verified Firebase ID Token + Firestore Role Verification (verifyCaller)
// ============================================================================

import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getServerEnv } from './env';
import { computeRequestFingerprint, getClientIp } from './rate-limit';
import { appendAuditLog } from './audit-ledger';
import { verifyCaller, VerifiedCaller } from '@/lib/livekitServer';

export const SESSION_COOKIE_NAME = 'ba_admin_session';
export const SESSION_TTL_MS = 30 * 60 * 1000; // Strictly 30 minutes

export interface AdminSessionPayload {
  email: string;
  role: 'admin' | 'teacher';
  iat: number;
  exp: number;
  jti: string;
  fp: string;
}

const revokedJtis = new Map<string, number>();

function pruneRevokedJtis(): void {
  if (revokedJtis.size <= 300) return;
  const now = Date.now();
  for (const [jti, exp] of revokedJtis.entries()) {
    if (now > exp) revokedJtis.delete(jti);
  }
}

export function hmacSignHex(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data, 'utf8').digest('hex');
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createSessionToken(
  email: string,
  fingerprint: string,
  role: 'admin' | 'teacher' = 'admin'
): string {
  const env = getServerEnv();
  const now = Date.now();
  const payload: AdminSessionPayload = {
    email: email.toLowerCase().trim(),
    role,
    iat: now,
    exp: now + SESSION_TTL_MS,
    jti: crypto.randomBytes(16).toString('hex'),
    fp: fingerprint,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function revokeSessionToken(token: string | undefined | null): void {
  if (!token || typeof token !== 'string') return;
  try {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0]) return;
    const decoded = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString('utf8')
    ) as Partial<AdminSessionPayload>;
    if (decoded.jti && typeof decoded.exp === 'number') {
      revokedJtis.set(decoded.jti, decoded.exp);
    }
  } catch {
    // Ignore malformed token
  }
}

export function verifySessionToken(
  token: string | undefined | null,
  expectedFingerprint?: string
):
  | { valid: true; payload: AdminSessionPayload }
  | { valid: false; reason: 'INVALID' | 'FINGERPRINT_MISMATCH' } {
  pruneRevokedJtis();
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'INVALID' };
  }

  const parts = token.split('.');
  const payloadB64 = parts[0];
  const providedSig = parts[1];
  if (parts.length !== 2 || !payloadB64 || !providedSig) {
    return { valid: false, reason: 'INVALID' };
  }

  const env = getServerEnv();
  const expectedSig = crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  if (!timingSafeEqualStr(providedSig, expectedSig)) {
    return { valid: false, reason: 'INVALID' };
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as AdminSessionPayload;

    if (!decoded.email || typeof decoded.exp !== 'number' || Date.now() > decoded.exp) {
      return { valid: false, reason: 'INVALID' };
    }

    if (decoded.jti && revokedJtis.has(decoded.jti)) {
      return { valid: false, reason: 'INVALID' };
    }

    if (expectedFingerprint && decoded.fp && decoded.fp !== expectedFingerprint) {
      revokedJtis.set(decoded.jti, decoded.exp);
      return { valid: false, reason: 'FINGERPRINT_MISMATCH' };
    }

    return { valid: true, payload: decoded };
  } catch {
    return { valid: false, reason: 'INVALID' };
  }
}

/**
 * Resolves the authenticated caller from either:
 *   1. Firebase ID Token (`Authorization: Bearer <idToken>`)
 *   2. Hardware-bound HttpOnly Admin Session Cookie (`ba_admin_session`)
 */
export async function getAuthenticatedCaller(req: Request): Promise<VerifiedCaller | null> {
  // 1. Check Authorization: Bearer <Firebase ID Token>
  const bearerCaller = await verifyCaller(req);
  if (bearerCaller) {
    return bearerCaller;
  }

  // 2. Check HttpOnly Admin Session Cookie
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const fp = computeRequestFingerprint(req);
    const ip = getClientIp(req);
    const verification = verifySessionToken(token, fp);

    if (!verification.valid) {
      if (verification.reason === 'FINGERPRINT_MISMATCH') {
        cookieStore.delete(SESSION_COOKIE_NAME);
        await appendAuditLog({
          severity: 'CRITICAL',
          eventType: 'SESSION_FINGERPRINT_MISMATCH',
          ip,
          fingerprint: fp,
          path: new URL(req.url).pathname,
          method: req.method,
          details: 'Admin session cookie replayed from mismatched User-Agent or IP subnet.',
        });
      }
      return null;
    }

    return {
      uid: `session:${verification.payload.email}`,
      email: verification.payload.email,
      role: verification.payload.role,
      isAdmin: true,
    };
  } catch {
    return null;
  }
}

export async function clearAdminSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      revokeSessionToken(token);
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // Ignore outside request context
  }
}
