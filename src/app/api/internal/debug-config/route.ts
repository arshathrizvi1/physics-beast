// ============================================================================
// ACTIVE DECEPTION CANARY TRAP ENDPOINT (/api/internal/debug-config)
// Immediately blacklists caller IP & fingerprint, clears session cookies,
// records a hash-chained CANARY_TRAP_TRIGGERED audit event, and engages tarpit.
// ============================================================================

import crypto from 'crypto';
import { appendAuditLog } from '@/security/audit-ledger';
import {
  blacklistActor,
  computeRequestFingerprint,
  engageCryptographicTarpit,
  getClientIp,
} from '@/security/rate-limit';
import { clearAdminSessionCookie } from '@/security/session';
import { attachSecurityHeaders, createOpaqueErrorResponse } from '@/security/zero-trust-gate';

async function handleCanaryTrap(req: Request) {
  const traceId = crypto.randomUUID();
  const ip = getClientIp(req);
  const fingerprint = computeRequestFingerprint(req);
  const pathname = new URL(req.url).pathname;

  blacklistActor({
    ip,
    fingerprint,
    reason: `Canary decoy endpoint triggered: ${pathname}`,
  });

  await clearAdminSessionCookie();

  await appendAuditLog({
    traceId,
    severity: 'CRITICAL',
    eventType: 'CANARY_TRAP_TRIGGERED',
    ip,
    fingerprint,
    path: pathname,
    method: req.method,
    details: {
      userAgent: req.headers.get('user-agent') || 'none',
    },
  });

  await engageCryptographicTarpit(2200, 3200);
  return attachSecurityHeaders(createOpaqueErrorResponse(403, traceId), req);
}

export const GET = handleCanaryTrap;
export const POST = handleCanaryTrap;
export const PUT = handleCanaryTrap;
export const DELETE = handleCanaryTrap;
