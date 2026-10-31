import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { sanitizePhone } from '@/security/sanitize';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withZeroTrustGate(
  {
    scope: 'check_phone',
    limit: 20,
    windowMs: 60 * 1000,
  },
  async (req, ctx) => {
    const parsed = await parseAndVerifyJsonBody<{ phone?: string }>(req, ctx);
    if (!parsed.ok) return parsed.response;

    const phone = sanitizePhone(parsed.body.phone);
    if (!phone) {
      return NextResponse.json({ exists: false });
    }

    const studentQuery = await adminDb.collection('users').where('phone', '==', phone).get();
    if (!studentQuery.empty) {
      return NextResponse.json({
        exists: true,
        reason: 'This number is already registered as a student.',
      });
    }

    const parentQuery = await adminDb.collection('users').where('parentPhone', '==', phone).get();
    if (!parentQuery.empty) {
      return NextResponse.json({
        exists: true,
        reason: 'This number is already registered as a parent.',
      });
    }

    return NextResponse.json({ exists: false });
  }
);
