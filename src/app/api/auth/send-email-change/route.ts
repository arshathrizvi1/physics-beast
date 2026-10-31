import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { Resend } from 'resend';
import { getServerEnv } from '@/security/env';
import { sanitizeEmail, sanitizeText } from '@/security/sanitize';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';

export const POST = withZeroTrustGate(
  {
    scope: 'auth_send_email_change',
    limit: 10,
    windowMs: 60 * 1000,
  },
  async (req, ctx) => {
    const parsed = await parseAndVerifyJsonBody<{
      email?: string;
      newEmail?: string;
      name?: string;
    }>(req, ctx);
    if (!parsed.ok) return parsed.response;

    const email = sanitizeEmail(parsed.body.email);
    const newEmail = sanitizeEmail(parsed.body.newEmail);
    const name = sanitizeText(parsed.body.name || 'Student', 80);

    if (!email || !newEmail) {
      return NextResponse.json(
        { error: 'Current email and new email are required' },
        { status: 400 }
      );
    }

    if (!adminAuth) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const actionCodeSettings = {
      url: 'https://brillliantacademy.site/login?mode=verifyAndChangeEmail',
      handleCodeInApp: true,
    };

    const rawLink = await adminAuth.generateVerifyAndChangeEmailLink(
      email,
      newEmail,
      actionCodeSettings
    );
    const urlObj = new URL(rawLink);
    const oobCode = urlObj.searchParams.get('oobCode');
    const changeLink = `https://brillliantacademy.site/login?mode=verifyAndChangeEmail&oobCode=${oobCode}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #0a0a0a; color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #d4af37; margin: 0; font-size: 28px;">Brilliant Academy</h1>
        </div>
        <div style="background-color: #1a1a1a; padding: 30px; border-radius: 8px;">
          <h2 style="color: #ffffff; margin-top: 0;">Confirm your new email address</h2>
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">Hello ${name},</p>
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">We received a request to change the email address for your Brilliant Academy account to this one. Click the button below to verify and complete the change.</p>
          <div style="text-align: center; margin: 35px 0;">
            <a href="${changeLink}" style="background-color: #d4af37; color: #000000; font-weight: bold; font-size: 16px; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block;">Confirm New Email</a>
          </div>
          <p style="color: #888888; font-size: 14px; line-height: 1.5; margin-bottom: 0;">If you did not request this change, please ignore this email and your account will remain unchanged.</p>
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
      to: newEmail,
      subject: 'Confirm your new email for Brilliant Academy',
      html: htmlContent,
    });

    return NextResponse.json({ success: true, data });
  }
);
