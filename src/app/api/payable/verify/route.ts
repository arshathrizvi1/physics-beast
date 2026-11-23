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

    const transactionId = String(checkout.payment.id || checkoutId);

    // Enforce Fail-Closed Dual-Lock Verification (HMAC Signature + Authoritative Price Match + Persistent Idempotency)
    const dualLock = await verifyPayableDualLock({
      referenceStr: refDataStr,
      paidAmountCents: Number(checkout.payment.amountCents || 0),
      transactionId,
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

    // Replay Defense: If transaction was already persisted in Firestore, return idempotent success
    // WITHOUT re-extending folderAccess expiry!
    if (alreadyProcessed) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        folderId,
        userId,
        amount: paidAmountLkr,
        paymentId: transactionId,
      });
    }

    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userData = userDoc.data() || {};

    const folderDoc = await adminDb.collection('folders').doc(folderId).get();
    const folderData = folderDoc.exists ? folderDoc.data() || {} : {};
    const courseName = folderData.name || 'Course';
    const courseId = String(folderData.courseId || '');

    const now = Date.now();
    const folderAccess = { ...(userData.folderAccess || {}) };
    const existingExpiry = Number(folderAccess[folderId] || 0);
    const baseTime = existingExpiry > now ? existingExpiry : now;
    folderAccess[folderId] = baseTime + 30 * 24 * 60 * 60 * 1000; // 30 days access

    // 1. Record payment document first with unique transactionId key (persistent replay lock)
    await adminDb.collection('payments').doc(transactionId).set(
      {
        userId,
        studentId: userId,
        studentName: userData.name || 'Student',
        studentEmail: userData.email || '',
        courseId,
        folderId,
        folderName: courseName,
        courseName,
        amount: paidAmountLkr,
        method: 'card',
        status: 'approved',
        createdAt: now,
        gateway: 'payable',
        transactionId,
      },
      { merge: true }
    );

    // 2. Unlock course folder securely via server Admin SDK
    await adminDb.collection('users').doc(userId).update({ folderAccess });

    return NextResponse.json({
      success: true,
      folderId,
      userId,
      amount: paidAmountLkr,
      paymentId: transactionId,
    });
  }
);
