import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { Resend } from 'resend';
import { getServerEnv } from '@/security/env';
import { sanitizeEmail, sanitizeText } from '@/security/sanitize';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';

export const POST = withZeroTrustGate(
  {
    scope: 'auth_send_password_reset',
    limit: 10,
    windowMs: 60 * 1000,
  },
  async (req, ctx) => {
    const parsed = await parseAndVerifyJsonBody<{ email?: string }>(req, ctx);
    if (!parsed.ok) return parsed.response;

    const email = sanitizeEmail(parsed.body.email);
    if (!email) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    if (!adminAuth) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const actionCodeSettings = {
      url: 'https://brillliantacademy.site/login?mode=resetPassword',
      handleCodeInApp: true,
    };

    const rawLink = await adminAuth.generatePasswordResetLink(email, actionCodeSettings);
    const urlObj = new URL(rawLink);
    const oobCode = urlObj.searchParams.get('oobCode');
    const resetLink = `https://brillliantacademy.site/login?mode=resetPassword&oobCode=${oobCode}`;

    let name = 'Student';
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      if (userRecord.displayName) {
        name = sanitizeText(userRecord.displayName, 80);
      }
    } catch {
      // Fallback
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #0a0a0a; color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #d4af37; margin: 0; font-size: 28px;">Brilliant Academy</h1>
        </div>
        <div style="background-color: #1a1a1a; padding: 30px; border-radius: 8px;">
          <h2 style="color: #ffffff; margin-top: 0;">Reset your password</h2>
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">Hello ${name},</p>
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">We received a request to reset your password for your Brilliant Academy account. Click the button below to securely set a new password.</p>
          <div style="text-align: center; margin: 35px 0;">
            <a href="${resetLink}" style="background-color: #d4af37; color: #000000; font-weight: bold; font-size: 16px; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #888888; font-size: 14px; line-height: 1.5; margin-bottom: 0;">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <p style="color: #666666; font-size: 12px;">© ${new Date().getFullYear()} Brilliant Academy. All rights reserved.</p>
        </div>
      </div>
    `;

    const env = getServerEnv();
    const resend = new Resend(env.RESEND_API_KEY);
    const data = await resend.emails.send({
      from: 'Brilliant Academy <admin@brillliantacademy.site>',
      to: email,
      subject: 'Reset your password for Brilliant Academy',
      html: htmlContent,
    });

    return NextResponse.json({ success: true, data });
  }
);
