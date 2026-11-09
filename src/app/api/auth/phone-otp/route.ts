import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { sanitizePhone, sanitizeText } from '@/security/sanitize';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    let fmtPhone = phone.trim();
    if (fmtPhone.startsWith('0')) fmtPhone = '+94' + fmtPhone.substring(1);
    if (!fmtPhone.startsWith('+')) fmtPhone = '+94' + fmtPhone;

    // ACTION: SEND OTP
    if (action === 'send') {
      try {
        // 1. Check if phone is already registered
        const studentQuery = await adminDb.collection('users').where('phone', '==', phone).get();
        if (!studentQuery.empty) {
          return NextResponse.json({
            success: false,
            error: 'This phone number is already registered to an existing account.',
          }, { status: 409 });
        }

        const parentQuery = await adminDb.collection('users').where('parentPhone', '==', phone).get();
        if (!parentQuery.empty) {
          return NextResponse.json({
            success: false,
            error: 'This phone number is already registered to an existing account.',
          }, { status: 409 });
        }

        // 2. Generate secure 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // 3. Save OTP in adminDb (server-authoritative)
        await adminDb.collection('otp_verifications').doc(fmtPhone).set({
          code: otp,
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
        });

        // 4. Enqueue WhatsApp message in academy_whatsapp_queue
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
      const code = sanitizeText(rawCode || '', 10).trim();
      if (!code || code.length !== 6) {
        return NextResponse.json({ success: false, error: 'Please enter a valid 6-digit code.' }, { status: 400 });
      }

      try {
        const otpDoc = await adminDb.collection('otp_verifications').doc(fmtPhone).get();
        if (!otpDoc.exists) {
          return NextResponse.json({ success: false, error: 'No verification code found. Please request a new code.' }, { status: 404 });
        }

        const data = otpDoc.data() || {};
        const isExpired = Date.now() - (data.timestamp || 0) > 10 * 60 * 1000; // 10 minutes TTL

        if (isExpired) {
          await adminDb.collection('otp_verifications').doc(fmtPhone).delete().catch(() => {});
          return NextResponse.json({ success: false, error: 'Verification code has expired. Please request a new code.' }, { status: 410 });
        }

        if (data.code !== code) {
          return NextResponse.json({ success: false, error: 'Invalid verification code. Please check and try again.' }, { status: 400 });
        }

        // Code matches and is valid! Consume it.
        await adminDb.collection('otp_verifications').doc(fmtPhone).delete().catch(() => {});

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
