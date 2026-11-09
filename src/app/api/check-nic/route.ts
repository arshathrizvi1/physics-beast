import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { sanitizeText } from '@/security/sanitize';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withZeroTrustGate(
  {
    scope: 'check_nic',
    limit: 20,
    windowMs: 60 * 1000,
  },
  async (req, ctx) => {
    const parsed = await parseAndVerifyJsonBody<{ nicNumber?: string }>(req, ctx);
    if (!parsed.ok) return parsed.response;

    const nic = sanitizeText(parsed.body.nicNumber || '', 20).trim();
    if (!nic) {
      return NextResponse.json({ exists: false });
    }

    const nicQuery = await adminDb.collection('users').where('nicNumber', '==', nic).get();
    if (!nicQuery.empty) {
      return NextResponse.json({
        exists: true,
        reason: 'This NIC number is already registered to an existing student account.',
      });
    }

    return NextResponse.json({ exists: false });
  }
);
