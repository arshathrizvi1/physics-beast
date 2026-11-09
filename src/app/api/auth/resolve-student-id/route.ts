import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { sanitizeText } from '@/security/sanitize';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withZeroTrustGate(
  {
    scope: 'resolve_student_id',
    limit: 25,
    windowMs: 60 * 1000,
  },
  async (req, ctx) => {
    const parsed = await parseAndVerifyJsonBody<{ studentId?: string }>(req, ctx);
    if (!parsed.ok) return parsed.response;

    const rawId = sanitizeText(parsed.body.studentId || '', 30).trim();
    if (!rawId) {
      return NextResponse.json({ email: null });
    }

    let formattedId = rawId.toUpperCase();
    if (!formattedId.startsWith('PB-') && /^\d+$/.test(formattedId)) {
      formattedId = `PB-${formattedId}`;
    }

    try {
      const q = await adminDb.collection('users').where('studentId', '==', formattedId).limit(1).get();
      if (!q.empty) {
        return NextResponse.json({ email: q.docs[0].data().email });
      }

      // Fallback: check raw input
      const qRaw = await adminDb.collection('users').where('studentId', '==', rawId).limit(1).get();
      if (!qRaw.empty) {
        return NextResponse.json({ email: qRaw.docs[0].data().email });
      }

      return NextResponse.json({ email: null });
    } catch (err) {
      console.error('Failed to resolve student ID:', err);
      return NextResponse.json({ email: null });
    }
  }
);
