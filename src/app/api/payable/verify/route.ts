import { NextResponse } from 'next/server';
import { PaymentsLk } from '@payments-lk/node';
import { adminDb } from '@/lib/firebase-admin';
import { getServerEnv } from '@/security/env';
import { sanitizeText } from '@/security/sanitize';
import { verifyPayableDualLock } from '@/security/payment-authority';
import {
  withZeroTrustGate,
  parseAndVerifyJsonBody,
} from '@/security/zero-trust-gate';

export const POST = withZeroTrustGate(
  {
    scope: 'payable_verify_payment',
    limit: 20,
    windowMs: 60 * 1000,
    requireAuth: 'authenticated',
  },
  async (req, ctx) => {
    const parsed = await parseAndVerifyJsonBody<{ checkoutId?: string }>(req, ctx);
    if (!parsed.ok) return parsed.response;

    const checkoutId = sanitizeText(parsed.body.checkoutId, 128);
    if (!checkoutId) {
      return NextResponse.json({ error: 'Missing checkoutId' }, { status: 400 });
    }

    const env = getServerEnv();
    if (!env.PAYABLE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Payment gateway secret key is not configured on the server.' },
        { status: 503 }
      );
    }

    const client = new PaymentsLk(env.PAYABLE_SECRET_KEY);
    const checkout = await client.checkouts.retrieve(checkoutId);

    if (checkout.payment?.status !== 'succeeded') {
      return NextResponse.json({
        success: false,
        status: checkout.payment?.status || 'unpaid',
      });
    }

    const refDataStr = checkout.payment.reference;
    if (!refDataStr) {
      return NextResponse.json(
        { error: 'No reference data found on payment' },
        { status: 400 }
      );
    }

    // Enforce Dual-Lock Verification (HMAC Signature + Authoritative Price Match + Idempotency)
    const dualLock = await verifyPayableDualLock({
      referenceStr: refDataStr,
      paidAmountCents: Number(checkout.payment.amountCents || 0),
      transactionId: String(checkout.payment.id || checkoutId),
      ip: ctx.ip,
      fingerprint: ctx.fingerprint,
    });

    if (!dualLock.ok) {
      return NextResponse.json(
        { error: dualLock.error },
        { status: dualLock.status }
      );
    }

    const { folderId, userId, paidAmountLkr, alreadyProcessed } = dualLock;

    // Security check: Caller must be the user receiving the course or an admin
    if (ctx.caller && ctx.caller.uid !== userId && !ctx.caller.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot verify payment for another user account.' },
        { status: 403 }
      );
    }

    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userData = userDoc.data() || {};

    const courseDoc = await adminDb.collection('folders').doc(folderId).get();
    const courseName = courseDoc.exists ? courseDoc.data()?.name : 'Course';

    const now = Date.now();
    const folderAccess = userData.folderAccess || {};
    folderAccess[folderId] = now + 30 * 24 * 60 * 60 * 1000; // 30 days access

    // 1. Unlock course securely
    await adminDb.collection('users').doc(userId).update({ folderAccess });

    // 2. Add to payments collection with atomic idempotency check (keyed by payment ID)
    if (!alreadyProcessed) {
      await adminDb.collection('payments').doc(String(checkout.payment.id)).set(
        {
          studentId: userId,
          studentName: userData.name || 'Student',
          studentEmail: userData.email || '',
          folderId,
          folderName: courseName,
          courseName,
          amount: paidAmountLkr,
          method: 'card',
          status: 'approved',
          createdAt: now,
          gateway: 'payable',
          transactionId: checkout.payment.id,
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      success: true,
      folderId,
      userId,
      amount: paidAmountLkr,
      paymentId: checkout.payment.id,
    });
  }
);
