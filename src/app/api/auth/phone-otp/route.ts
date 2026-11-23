import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { sanitizePhone, sanitizeText } from '@/security/sanitize';
import { getServerEnv } from '@/security/env';
import { timingSafeEqualStr } from '@/security/session';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PHONE_OTP_TTL_MS = 10 * 60 * 1000;
const PHONE_OTP_RESEND_COOLDOWN_MS = 45 * 1000;
const PHONE_OTP_MAX_ATTEMPTS = 5;

function hashPhoneOtp(fmtPhone: string, code: string): string {
  const env = getServerEnv();
  return crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(`phone_otp|${fmtPhone}|${code}`, 'utf8')
    .digest('hex');
}

export const POST = withZeroTrustGate(
  {
    scope: 'phone_otp',
    limit: 10,
    windowMs: 60 * 1000,
  },
  async (req, ctx) => {
    const parsed = await parseAndVerifyJsonBody<{
      action?: string;
      phone?: string;
      code?: string;
    }>(req, ctx);

    if (!parsed.ok) return parsed.response;
    const { action, phone: rawPhone, code: rawCode } = parsed.body;

    const phone = sanitizePhone(rawPhone);
    if (!phone) {
      return NextResponse.json({ success: false, error: 'Valid phone number is required.' }, { status: 400 });
    }

    let fmtPhone = phone.trim().replace(/[^0-9+]/g, '');
    if (fmtPhone.startsWith('0')) fmtPhone = '+94' + fmtPhone.substring(1);
    if (!fmtPhone.startsWith('+')) fmtPhone = '+94' + fmtPhone;
    if (!/^\+[0-9]{8,15}$/.test(fmtPhone)) {
      return NextResponse.json({ success: false, error: 'Invalid phone number format.' }, { status: 400 });
    }

    const otpDocRef = adminDb.collection('otp_verifications').doc(fmtPhone);

    // ACTION: SEND OTP
    if (action === 'send') {
      try {
        // 1. Enforce resend cooldown to prevent WhatsApp queue flooding
        const existingOtpSnap = await otpDocRef.get();
        if (existingOtpSnap.exists) {
          const existing = existingOtpSnap.data() || {};
          const elapsed = Date.now() - Number(existing.timestamp || 0);
          if (elapsed < PHONE_OTP_RESEND_COOLDOWN_MS) {
            const waitSec = Math.ceil((PHONE_OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
            return NextResponse.json(
              { success: false, error: `Please wait ${waitSec}s before requesting a new verification code.` },
              { status: 429 }
            );
          }
        }

        // 2. Check if phone is already registered
        const studentQuery = await adminDb.collection('users').where('phone', '==', phone).limit(1).get();
        if (!studentQuery.empty) {
          return NextResponse.json({
            success: false,
            error: 'This phone number is already registered to an existing account.',
          }, { status: 409 });
        }

        const parentQuery = await adminDb.collection('users').where('parentPhone', '==', phone).limit(1).get();
        if (!parentQuery.empty) {
          return NextResponse.json({
            success: false,
            error: 'This phone number is already registered to an existing account.',
          }, { status: 409 });
        }

        // 3. Generate cryptographically secure 6-digit OTP via CSPRNG
        const otp = String(crypto.randomInt(100000, 1000000));
        const otpHash = hashPhoneOtp(fmtPhone, otp);

        // 4. Save HMAC-hashed OTP in adminDb (never store plaintext OTP)
        await otpDocRef.set({
          otpHash,
          attempts: 0,
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
        });

        // 5. Enqueue WhatsApp message in academy_whatsapp_queue
        await adminDb.collection('academy_whatsapp_queue').add({
          phone: fmtPhone,
          message: `*Brilliant Academy 🎓*\n\nYour Verification Code is: *${otp}*\n\nPlease enter this code to verify your account.\n\n_Do not share this code with anyone._`,
          status: 'pending',
          isGroup: false,
          type: 'otp',
          createdAt: Date.now(),
        });

        return NextResponse.json({
          success: true,
          message: 'Verification code sent successfully via WhatsApp.',
        });
      } catch (err: any) {
        console.error('Failed to dispatch phone OTP:', err);
        return NextResponse.json({
          success: false,
          error: 'Failed to dispatch verification code. Please try again.',
        }, { status: 500 });
      }
    }

    // ACTION: VERIFY OTP
    if (action === 'verify') {
      const code = sanitizeText(rawCode || '', 10).replace(/\D/g, '');
      if (code.length !== 6) {
        return NextResponse.json({ success: false, error: 'Please enter a valid 6-digit code.' }, { status: 400 });
      }

      try {
        const otpDoc = await otpDocRef.get();
        if (!otpDoc.exists) {
          return NextResponse.json({ success: false, error: 'No verification code found. Please request a new code.' }, { status: 404 });
        }

        const data = otpDoc.data() || {};
        const isExpired = Date.now() - Number(data.timestamp || 0) > PHONE_OTP_TTL_MS;

        if (isExpired) {
          await otpDocRef.delete().catch(() => {});
          return NextResponse.json({ success: false, error: 'Verification code has expired. Please request a new code.' }, { status: 410 });
        }

        const attempts = Number(data.attempts || 0);
        if (attempts >= PHONE_OTP_MAX_ATTEMPTS) {
          await otpDocRef.delete().catch(() => {});
          return NextResponse.json(
            { success: false, error: 'Too many failed attempts. Please request a new verification code.' },
            { status: 429 }
          );
        }

        const expectedHash = typeof data.otpHash === 'string' && data.otpHash
          ? data.otpHash
          : (typeof data.code === 'string' ? hashPhoneOtp(fmtPhone, data.code) : '');
        const providedHash = hashPhoneOtp(fmtPhone, code);

        if (!expectedHash || !timingSafeEqualStr(providedHash, expectedHash)) {
          const nextAttempts = attempts + 1;
          if (nextAttempts >= PHONE_OTP_MAX_ATTEMPTS) {
            await otpDocRef.delete().catch(() => {});
          } else {
            await otpDocRef.update({ attempts: nextAttempts }).catch(() => {});
          }
          const remaining = Math.max(0, PHONE_OTP_MAX_ATTEMPTS - nextAttempts);
          return NextResponse.json(
            { success: false, error: `Invalid verification code. ${remaining} attempt(s) remaining.` },
            { status: 400 }
          );
        }

        // Code matches and is valid! Consume it.
        await otpDocRef.delete().catch(() => {});

        return NextResponse.json({
          success: true,
          verified: true,
          message: 'Phone verified successfully.',
        });
      } catch (err: any) {
        console.error('Failed to verify phone OTP:', err);
        return NextResponse.json({ success: false, error: 'Error verifying code. Please try again.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Supported actions: send, verify' }, { status: 400 });
  }
);
