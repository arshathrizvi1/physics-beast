import { NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/lib/firebaseAdmin';
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
    const parsed = await parseAndVerifyJsonBody<{ email?: string; studentId?: string; identifier?: string }>(req, ctx);
    if (!parsed.ok) return parsed.response;

    const rawInput = (parsed.body.identifier || parsed.body.email || parsed.body.studentId || '').trim();
    if (!rawInput) {
      return NextResponse.json({ error: 'Valid email or Student ID is required' }, { status: 400 });
    }

    if (!adminAuth) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    let targetEmail = rawInput.includes('@') ? sanitizeEmail(rawInput) : null;

    // Secure server-side Student ID lookup without exposing client-side permissions
    if (!targetEmail && adminFirestore) {
      try {
        let formattedId = rawInput.toUpperCase();
        if (!formattedId.startsWith('PB-') && /^\d+$/.test(formattedId)) {
          formattedId = `PB-${formattedId}`;
        }

        const snap = await adminFirestore.collection('users').where('studentId', '==', formattedId).limit(1).get();
        if (!snap.empty) {
          targetEmail = sanitizeEmail(snap.docs[0].data()?.email);
        } else {
          const rawSnap = await adminFirestore.collection('users').where('studentId', '==', rawInput).limit(1).get();
          if (!rawSnap.empty) {
            targetEmail = sanitizeEmail(rawSnap.docs[0].data()?.email);
          }
        }
      } catch (err) {
        console.error('Failed to lookup student ID in password reset:', err);
      }
    }

    // Generic response if targetEmail could not be found to prevent enumeration
    if (!targetEmail) {
      return NextResponse.json({ 
        success: true, 
        message: 'If an account is associated with this identifier, a password reset link has been dispatched.' 
      });
    }

    const actionCodeSettings = {
      url: 'https://brillliantacademy.site/login?mode=resetPassword',
      handleCodeInApp: true,
    };

    let resetLink = '';
    try {
      const rawLink = await adminAuth.generatePasswordResetLink(targetEmail, actionCodeSettings);
      const urlObj = new URL(rawLink);
      const oobCode = urlObj.searchParams.get('oobCode');
      resetLink = `https://brillliantacademy.site/login?mode=resetPassword&oobCode=${oobCode}`;
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        return NextResponse.json({ 
          success: true, 
          message: 'If an account is associated with this identifier, a password reset link has been dispatched.' 
        });
      }
      console.error('Error generating reset link:', err);
      return NextResponse.json({ error: 'Unable to process password reset request' }, { status: 500 });
    }

    let name = 'Student';
    try {
      const userRecord = await adminAuth.getUserByEmail(targetEmail);
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

    try {
      const env = getServerEnv();
      const resend = new Resend(env.RESEND_API_KEY);
      const data = await resend.emails.send({
        from: 'Brilliant Academy <admin@brillliantacademy.site>',
        to: targetEmail,
        subject: 'Reset your password for Brilliant Academy',
        html: htmlContent,
      });

      return NextResponse.json({ success: true, data });
    } catch (err) {
      console.error('Failed to dispatch reset email via Resend:', err);
      return NextResponse.json({ error: 'Failed to deliver reset email' }, { status: 500 });
    }
  }
);
