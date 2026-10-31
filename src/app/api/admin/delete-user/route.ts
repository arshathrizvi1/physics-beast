import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { sanitizeText } from '@/security/sanitize';
import { appendAuditLog } from '@/security/audit-ledger';

export const POST = withZeroTrustGate(
  {
    scope: 'admin_delete_user',
    limit: 20,
    windowMs: 60 * 1000,
    requireAuth: 'admin',
  },
  async (request, ctx) => {
    const parsed = await parseAndVerifyJsonBody<{ userId?: string }>(request, ctx);
    if (!parsed.ok) return parsed.response;

    const userId = sanitizeText(parsed.body.userId, 128);
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
      if (adminAuth && typeof adminAuth.deleteUser === 'function') {
        await adminAuth.deleteUser(userId);
      }
    } catch (authError: any) {
      console.warn('Failed to delete from Auth:', authError?.message);
    }

    await appendAuditLog({
      traceId: ctx.traceId,
      severity: 'INFO',
      eventType: 'ADMIN_MUTATION',
      ip: ctx.ip,
      fingerprint: ctx.fingerprint,
      path: '/api/admin/delete-user',
      method: 'POST',
      details: { action: 'delete_user', targetUserId: userId, adminEmail: ctx.caller?.email },
    });

    return NextResponse.json({ success: true });
  }
);
