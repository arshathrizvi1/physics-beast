import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  issueServerOtp,
  verifyAndConsumeServerOtp,
  OTP_TTL_SECONDS,
} from '@/security/otp-authority';
import { sanitizeText } from '@/security/sanitize';
import { getServerEnv } from '@/security/env';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';

/**
 * POST /api/auth/otp
 * Server-authoritative 5-minute CSPRNG 6-digit OTP issue & verify endpoint.
 */
export const POST = withZeroTrustGate(
  { scope: 'auth_otp', limit: 15, windowMs: 60 * 1000 },
  async (req, ctx) => {
    const parsed = await parseAndVerifyJsonBody<{
      action?: string;
      email?: string;
      purpose?: string;
      code?: string;
      name?: string;
    }>(req, ctx);

    if (!parsed.ok) return parsed.response;
    const { action, email, purpose = 'verify_email', code, name } = parsed.body;

    if (action === 'issue') {
      const issued = await issueServerOtp({ email, purpose });
      if (!issued.ok || !issued.code || !issued.email) {
        return NextResponse.json(
          { ok: false, error: issued.error || 'Failed to issue OTP.' },
          { status: issued.status || 400 }
        );
      }

      const env = getServerEnv();
      const safeName = sanitizeText(name || 'Student', 80);

      if (env.RESEND_API_KEY) {
        try {
          const resend = new Resend(env.RESEND_API_KEY);
          await resend.emails.send({
            from: 'Brilliant Academy <admin@brillliantacademy.site>',
            to: issued.email,
            subject:
              purpose === 'reset_password'
                ? 'Your Brilliant Academy Password Reset Code (Valid 5 Minutes)'
                : 'Your Brilliant Academy Verification Code (Valid 5 Minutes)',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #0a0a0a; color: #ffffff;">
                <h1 style="color: #d4af37; text-align: center;">Brilliant Academy</h1>
                <div style="background-color: #1a1a1a; padding: 30px; border-radius: 8px; text-align: center;">
                  <p style="color: #cccccc; font-size: 16px;">Hello ${safeName},</p>
                  <p style="color: #cccccc; font-size: 15px;">Your 6-digit security verification code (valid strictly for 5 minutes) is:</p>
                  <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #d4af37; margin: 24px 0;">${issued.code}</div>
                  <p style="color: #888888; font-size: 13px;">This code expires in 5 minutes and can only be used once.</p>
                </div>
              </div>
            `,
          });
        } catch {
          // Non-fatal if Resend is in sandbox mode
        }
      }

      return NextResponse.json({
        ok: true,
        email: issued.email,
        purpose: issued.purpose,
        expiresAt: issued.expiresAt,
        expiresInSeconds: OTP_TTL_SECONDS,
      });
    }

    if (action === 'verify') {
      const verified = await verifyAndConsumeServerOtp({ email, purpose, code });
      if (!verified.valid) {
        return NextResponse.json(
          { ok: false, valid: false, error: verified.error },
          { status: verified.status }
        );
      }

      return NextResponse.json({
        ok: true,
        valid: true,
        email: verified.email,
      });
    }

    return NextResponse.json(
      { ok: false, error: 'Unsupported OTP action. Use "issue" or "verify".' },
      { status: 400 }
    );
  }
);
