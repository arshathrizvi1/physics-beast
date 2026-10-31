// ============================================================================
// SLIDING-WINDOW RATE LIMITER, DEVICE FINGERPRINTING, ANTI-REPLAY & TARPIT
// ============================================================================

import crypto from 'crypto';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface BlacklistRecord {
  reason: string;
  expiresAt: number;
}

const rateLimitStore = new Map<string, RateLimitBucket>();
const blacklistedIps = new Map<string, BlacklistRecord>();
const blacklistedFingerprints = new Map<string, BlacklistRecord>();
const replayNonceStore = new Map<string, number>();

const BLACKLIST_DURATION_MS = 24 * 60 * 60 * 1000;
const NONCE_TTL_MS = 10 * 60 * 1000;
export const MAX_REPLAY_WINDOW_MS = 60 * 1000; // Strictly 60 seconds

function pruneStores(): void {
  const now = Date.now();
  if (rateLimitStore.size > 500) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetAt) rateLimitStore.delete(k);
    }
  }
  if (blacklistedIps.size > 500) {
    for (const [k, v] of blacklistedIps.entries()) {
      if (now > v.expiresAt) blacklistedIps.delete(k);
    }
  }
  if (blacklistedFingerprints.size > 500) {
    for (const [k, v] of blacklistedFingerprints.entries()) {
      if (now > v.expiresAt) blacklistedFingerprints.delete(k);
    }
  }
  if (replayNonceStore.size > 1000) {
    for (const [k, exp] of replayNonceStore.entries()) {
      if (now > exp) replayNonceStore.delete(k);
    }
  }
}

export function getClientIp(req: Request): string {
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    if (first) return first.trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

export const extractClientIp = getClientIp;

export function extractIpSubnet(ip: string): string {
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 4).join(':')}::/64`;
  }
  return ip;
}

export function computeRequestFingerprint(
  req?: Request | null,
  fallbackUa = '',
  fallbackIp = '127.0.0.1'
): string {
  const ua = (req?.headers.get('user-agent') ?? fallbackUa).trim().toLowerCase();
  const ip = req ? getClientIp(req) : fallbackIp;
  const subnet = extractIpSubnet(ip);
  return crypto.createHash('sha256').update(`${ua}|${subnet}`, 'utf8').digest('hex');
}

export const computeDeviceFingerprint = computeRequestFingerprint;

export function checkRateLimit(params: {
  scope: string;
  ip: string;
  fingerprint?: string;
  limit: number;
  windowMs: number;
}): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  pruneStores();
  const now = Date.now();
  const key = `${params.scope}:${params.ip}:${params.fingerprint || 'nofp'}`;
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + params.windowMs });
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(0, params.limit - 1),
    };
  }

  if (existing.count >= params.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds, remaining: 0 };
  }

  existing.count += 1;
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, params.limit - existing.count),
  };
}

export function blacklistActor(params: {
  ip: string;
  fingerprint?: string;
  reason: string;
}): void {
  const expiresAt = Date.now() + BLACKLIST_DURATION_MS;
  blacklistedIps.set(params.ip, { reason: params.reason, expiresAt });
  if (params.fingerprint) {
    blacklistedFingerprints.set(params.fingerprint, { reason: params.reason, expiresAt });
  }
}

export function isActorBlacklisted(params: { ip: string; fingerprint?: string }): boolean {
  const now = Date.now();
  const ipRecord = blacklistedIps.get(params.ip);
  if (ipRecord) {
    if (now <= ipRecord.expiresAt) return true;
    blacklistedIps.delete(params.ip);
  }
  if (params.fingerprint) {
    const fpRecord = blacklistedFingerprints.get(params.fingerprint);
    if (fpRecord) {
      if (now <= fpRecord.expiresAt) return true;
      blacklistedFingerprints.delete(params.fingerprint);
    }
  }
  return false;
}

export function verifyAntiReplay(req: Request): { valid: boolean; reason?: string } {
  pruneStores();
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return { valid: true };
  }

  const tsHeader = req.headers.get('x-request-timestamp');
  if (tsHeader) {
    const parsedTs = Number(tsHeader);
    if (!Number.isFinite(parsedTs) || Math.abs(Date.now() - parsedTs) > MAX_REPLAY_WINDOW_MS) {
      return { valid: false, reason: 'EXPIRED_OR_INVALID_TIMESTAMP' };
    }
  }

  const nonceHeader =
    req.headers.get('x-request-nonce') || req.headers.get('x-idempotency-key');
  if (nonceHeader) {
    if (nonceHeader.length > 128 || !/^[a-zA-Z0-9\-_:.]+$/.test(nonceHeader)) {
      return { valid: false, reason: 'MALFORMED_NONCE' };
    }
    const ip = getClientIp(req);
    const scopedKey = `${ip}:${nonceHeader}`;
    const now = Date.now();
    const existingExp = replayNonceStore.get(scopedKey);
    if (existingExp && now < existingExp) {
      return { valid: false, reason: 'REPLAYED_NONCE' };
    }
    replayNonceStore.set(scopedKey, now + NONCE_TTL_MS);
  }

  return { valid: true };
}

export async function engageCryptographicTarpit(minMs = 1200, maxMs = 2500): Promise<void> {
  const span = Math.max(100, maxMs - minMs);
  const rand = crypto.randomInt(0, span);
  const bounded = Math.min(Math.max(minMs + rand, 250), 5000);
  await new Promise<void>((resolve) => {
    setTimeout(resolve, bounded);
  });
}
