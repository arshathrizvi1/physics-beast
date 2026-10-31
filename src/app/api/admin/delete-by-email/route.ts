import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { sanitizeEmail } from '@/security/sanitize';
import { appendAuditLog } from '@/security/audit-ledger';

export const POST = withZeroTrustGate(
  {
    scope: 'admin_delete_by_email',
    limit: 20,
    windowMs: 60 * 1000,
    requireAuth: 'admin',
  },
  async (request, ctx) => {
    const parsed = await parseAndVerifyJsonBody<{ email?: string }>(request, ctx);
    if (!parsed.ok) return parsed.response;

    const email = sanitizeEmail(parsed.body.email);
    if (!email) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    try {
      const user = await adminAuth.getUserByEmail(email);
      await adminAuth.deleteUser(user.uid);

      await appendAuditLog({
        traceId: ctx.traceId,
        severity: 'INFO',
        eventType: 'ADMIN_MUTATION',
        ip: ctx.ip,
        fingerprint: ctx.fingerprint,
        path: '/api/admin/delete-by-email',
        method: 'POST',
        details: { action: 'delete_by_email', targetEmail: email, adminEmail: ctx.caller?.email },
      });

      return NextResponse.json({ success: true, message: `Deleted ${email} from Auth` });
    } catch (authError: any) {
      return NextResponse.json({ error: authError?.message || 'User not found' }, { status: 404 });
    }
  }
);
