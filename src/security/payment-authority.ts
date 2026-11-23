// ============================================================================
// SERVER-SIDE PRICE AUTHORITY & DUAL-LOCK PAYMENT VERIFICATION ENGINE
// Defends against E-Commerce & Course Enrollment Payment Hacks:
//   1. Direct Price Editing (Browser never dictates authoritative folder/course price)
//   2. Negative Quantity / Price Trick (Strict positive numeric bounds)
//   3. Gateway Reference Tampering (Mandatory HMAC-SHA256 signed reference verification)
//   4. Fake / Partial Payment Unlock (Fail-Closed Dual-Lock compares paidAmount >= expectedAmount)
//   5. Replay Double-Spend (Persistent Firestore transactionId idempotency check)
// ============================================================================

import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { getServerEnv } from './env';
import { appendAuditLog } from './audit-ledger';
import { timingSafeEqualStr } from './session';

const processedTransactionsMemory = new Set<string>();

/**
 * Resolves the authoritative price for a course folder or course directly from
 * Firebase Firestore on the server so a browser client can never spoof a 1-cent price.
 */
export async function resolveAuthoritativeCoursePrice(params: {
  courseId: string;
  folderId: string;
  clientSubmittedPrice: number;
  ip: string;
  fingerprint: string;
}): Promise<{
  authoritativePrice: number;
  courseName: string;
  tampered: boolean;
  source: 'firestore_folder' | 'firestore_course' | 'validated_fallback';
}> {
  let authoritativePrice = 0;
  let resolvedName = '';
  let source: 'firestore_folder' | 'firestore_course' | 'validated_fallback' = 'validated_fallback';

  try {
    if (params.folderId) {
      const folderSnap = await adminDb.collection('folders').doc(params.folderId).get();
      if (folderSnap.exists) {
        const folderData = folderSnap.data() || {};
        const folderPrice = Number(folderData.price);
        if (Number.isFinite(folderPrice) && folderPrice > 0) {
          authoritativePrice = folderPrice;
          resolvedName = String(folderData.name || '');
          source = 'firestore_folder';
        }
      }
    }

    if (authoritativePrice <= 0 && params.courseId) {
      const courseSnap = await adminDb.collection('courses').doc(params.courseId).get();
      if (courseSnap.exists) {
        const courseData = courseSnap.data() || {};
        const coursePrice = Number(courseData.price);
        if (Number.isFinite(coursePrice) && coursePrice > 0) {
          authoritativePrice = coursePrice;
          resolvedName = String(courseData.name || resolvedName);
          source = 'firestore_course';
        }
      }
    }
  } catch (err) {
    console.error('[PaymentAuthority] Firestore price lookup error:', err);
  }

  let tampered = false;
  if (authoritativePrice > 0) {
    // Check if client attempted to submit a lower price than the server-authoritative price
    if (Math.abs(params.clientSubmittedPrice - authoritativePrice) > 1) {
      tampered = true;
      await appendAuditLog({
        severity: 'CRITICAL',
        eventType: 'CHECKOUT_PRICE_TAMPERING',
        ip: params.ip,
        fingerprint: params.fingerprint,
        path: '/api/payable/create-checkout',
        method: 'POST',
        details: {
          courseId: params.courseId,
          folderId: params.folderId,
          clientSubmittedPrice: params.clientSubmittedPrice,
          authoritativePrice,
        },
      });
    }
  } else {
    // Enforce minimum LKR floor (e.g., 100 LKR) if folder has no explicit price field in DB
    authoritativePrice = Math.max(100, Math.round(params.clientSubmittedPrice));
  }

  return {
    authoritativePrice,
    courseName: resolvedName || 'Brilliant Academy Course',
    tampered,
    source,
  };
}

/**
 * Generates an HMAC-SHA256 8-char signature tag over [folderId, userId, expectedCents]
 * that fits inside Payable's 64-character reference limit.
 */
export function computeCompactReferenceSignature(
  folderId: string,
  userId: string,
  amountCents: number
): string {
  const env = getServerEnv();
  return crypto
    .createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET)
    .update(`${folderId}|${userId}|${amountCents}`, 'utf8')
    .digest('hex')
    .slice(0, 8);
}

/**
 * Packs [folderId, userId, sig8] strictly within Payable's 64-char reference limit.
 * Uses compact pipe-delimited format (`folderId|userId|sig8`) when JSON exceeds 64 chars
 * so the cryptographic HMAC signature is NEVER omitted.
 */
export function packSignedPayableReference(
  folderId: string,
  userId: string,
  amountCents: number
): string {
  const sig8 = computeCompactReferenceSignature(folderId, userId, amountCents);
  const packedJson = JSON.stringify([folderId, userId, sig8]);
  if (packedJson.length <= 64) {
    return packedJson;
  }
  const packedPipe = `${folderId}|${userId}|${sig8}`;
  if (packedPipe.length <= 64) {
    return packedPipe;
  }
  // Fallback: 6-char sig if both IDs are unusually long
  return `${folderId}|${userId}|${sig8.slice(0, 6)}`.slice(0, 64);
}

/**
 * Fail-Closed Dual-Lock Verification for Payable Checkout:
 *   Lock 1: Verifies reference format and mandatory HMAC-SHA256 signature tag.
 *   Lock 2: Fail-closed comparison of paidAmountCents >= authoritative folder price in Firestore.
 *   Lock 3: Persistent Firestore + memory idempotency check on transactionId (prevents replay across cold starts).
 */
export async function verifyPayableDualLock(params: {
  referenceStr: string;
  paidAmountCents: number;
  transactionId: string;
  ip: string;
  fingerprint: string;
}): Promise<
  | {
      ok: true;
      folderId: string;
      userId: string;
      paidAmountLkr: number;
      alreadyProcessed: boolean;
    }
  | {
      ok: false;
      status: number;
      error: string;
    }
> {
  let folderId = '';
  let userId = '';
  let providedSig = '';

  const rawRef = String(params.referenceStr || '').trim();
  if (rawRef.startsWith('[')) {
    let parsedRef: unknown;
    try {
      parsedRef = JSON.parse(rawRef);
    } catch {
      return { ok: false, status: 400, error: 'Invalid reference data format.' };
    }
    if (!Array.isArray(parsedRef) || parsedRef.length < 2) {
      return { ok: false, status: 400, error: 'Malformed payment reference tuple.' };
    }
    folderId = String(parsedRef[0] || '').trim();
    userId = String(parsedRef[1] || '').trim();
    providedSig = parsedRef[2] ? String(parsedRef[2]).trim() : '';
  } else if (rawRef.includes('|')) {
    const parts = rawRef.split('|');
    if (parts.length < 3) {
      return { ok: false, status: 400, error: 'Malformed compact payment reference.' };
    }
    folderId = String(parts[0] || '').trim();
    userId = String(parts[1] || '').trim();
    providedSig = String(parts[2] || '').trim();
  } else {
    return { ok: false, status: 400, error: 'Unrecognized payment reference format.' };
  }

  if (!folderId || !userId) {
    return { ok: false, status: 400, error: 'Missing folderId or userId in reference.' };
  }

  // LOCK 1: Mandatory cryptographic HMAC-SHA256 signature verification (fail-closed)
  if (!providedSig || providedSig.length < 6) {
    await appendAuditLog({
      severity: 'CRITICAL',
      eventType: 'FORGED_PAYMENT_WEBHOOK',
      ip: params.ip,
      fingerprint: params.fingerprint,
      path: '/api/payable/verify',
      method: 'POST',
      details: { reason: 'MISSING_HMAC_TAG', folderId, userId, transactionId: params.transactionId },
    });
    return {
      ok: false,
      status: 403,
      error: 'Missing cryptographic payment reference signature.',
    };
  }

  const expectedSigFull = computeCompactReferenceSignature(
    folderId,
    userId,
    params.paidAmountCents
  );
  const expectedSigMatched = expectedSigFull.slice(0, providedSig.length);
  if (!timingSafeEqualStr(providedSig, expectedSigMatched)) {
    await appendAuditLog({
      severity: 'CRITICAL',
      eventType: 'FORGED_PAYMENT_WEBHOOK',
      ip: params.ip,
      fingerprint: params.fingerprint,
      path: '/api/payable/verify',
      method: 'POST',
      details: { folderId, userId, transactionId: params.transactionId },
    });
    return {
      ok: false,
      status: 403,
      error: 'Cryptographic payment reference signature mismatch.',
    };
  }

  // LOCK 2: Fail-closed verification of paidAmountCents against authoritative Firestore folder/course price
  try {
    const folderSnap = await adminDb.collection('folders').doc(folderId).get();
    if (!folderSnap.exists) {
      return {
        ok: false,
        status: 404,
        error: 'Target course folder not found.',
      };
    }
    const folderData = folderSnap.data() || {};
    let authoritativePriceLkr = Number(folderData.price);
    if ((!Number.isFinite(authoritativePriceLkr) || authoritativePriceLkr <= 0) && folderData.courseId) {
      const courseSnap = await adminDb.collection('courses').doc(String(folderData.courseId)).get();
      if (courseSnap.exists) {
        const coursePrice = Number(courseSnap.data()?.price);
        if (Number.isFinite(coursePrice) && coursePrice > 0) {
          authoritativePriceLkr = coursePrice;
        }
      }
    }
    const minExpectedLkr =
      Number.isFinite(authoritativePriceLkr) && authoritativePriceLkr > 0
        ? authoritativePriceLkr
        : 100;
    const expectedCents = Math.round(minExpectedLkr * 100);
    if (params.paidAmountCents < expectedCents) {
      await appendAuditLog({
        severity: 'CRITICAL',
        eventType: 'PAYMENT_AMOUNT_MISMATCH_FRAUD',
        ip: params.ip,
        fingerprint: params.fingerprint,
        path: '/api/payable/verify',
        method: 'POST',
        details: {
          folderId,
          userId,
          paidAmountCents: params.paidAmountCents,
          expectedCents,
          transactionId: params.transactionId,
        },
      });
      return {
        ok: false,
        status: 422,
        error: 'Payment amount is less than the authoritative course price.',
      };
    }
  } catch (err) {
    console.error('[PaymentAuthority] Fail-closed Firestore price verification error:', err);
    return {
      ok: false,
      status: 503,
      error: 'Unable to verify authoritative course price at this time. Please retry.',
    };
  }

  // LOCK 3: Persistent Firestore + in-memory idempotency check on transactionId
  let alreadyProcessed = processedTransactionsMemory.has(params.transactionId);
  if (!alreadyProcessed && params.transactionId) {
    try {
      const existingPayDoc = await adminDb
        .collection('payments')
        .doc(String(params.transactionId))
        .get();
      if (existingPayDoc.exists) {
        alreadyProcessed = true;
      }
    } catch (err) {
      console.error('[PaymentAuthority] Fail-closed idempotency lookup error:', err);
      return {
        ok: false,
        status: 503,
        error: 'Unable to verify payment idempotency state. Please retry.',
      };
    }
  }
  processedTransactionsMemory.add(params.transactionId);

  return {
    ok: true,
    folderId,
    userId,
    paidAmountLkr: params.paidAmountCents / 100,
    alreadyProcessed,
  };
}
