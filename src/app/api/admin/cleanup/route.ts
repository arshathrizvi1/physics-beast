import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { withZeroTrustGate } from '@/security/zero-trust-gate';
import { appendAuditLog } from '@/security/audit-ledger';

export const dynamic = 'force-dynamic';

export const GET = withZeroTrustGate(
  {
    scope: 'admin_cleanup_orphans',
    limit: 5,
    windowMs: 60 * 1000,
    requireAuth: 'admin',
  },
  async (_request, ctx) => {
    if (!adminAuth || typeof adminAuth.listUsers !== 'function') {
      return NextResponse.json(
        { error: 'Firebase Admin not configured properly. Ensure ENV variables are set.' },
        { status: 500 }
      );
    }

    const listUsersResult = await adminAuth.listUsers(1000);
    const authUsers = listUsersResult.users;

    const snapshot = await adminDb.collection('users').get();
    const validUids = new Set<string>();
    snapshot.docs.forEach((doc: any) => {
      validUids.add(doc.id);
    });

    const deletedEmails: string[] = [];

    for (const authUser of authUsers) {
      if (!validUids.has(authUser.uid)) {
        try {
          await adminAuth.deleteUser(authUser.uid);
          if (authUser.email) deletedEmails.push(authUser.email);
        } catch (err: any) {
          console.error(`Failed to delete ${authUser.email}:`, err.message);
        }
      }
    }

    await appendAuditLog({
      traceId: ctx.traceId,
      severity: 'INFO',
      eventType: 'ADMIN_MUTATION',
      ip: ctx.ip,
      fingerprint: ctx.fingerprint,
      path: '/api/admin/cleanup',
      method: 'GET',
      details: {
        action: 'cleanup_orphans',
        deletedCount: deletedEmails.length,
        adminEmail: ctx.caller?.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${deletedEmails.length} orphaned accounts that were stuck in Auth.`,
      deletedAccounts: deletedEmails,
    });
  }
);
