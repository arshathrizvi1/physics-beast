import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!adminAuth) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const actionCodeSettings = {
      url: 'https://brillliantacademy.site/login?mode=resetPassword',
      handleCodeInApp: true,
    };

    // 1. Generate the secure reset link via Firebase Admin SDK
    const rawLink = await adminAuth.generatePasswordResetLink(email, actionCodeSettings);
    const urlObj = new URL(rawLink);
    const oobCode = urlObj.searchParams.get('oobCode');
    const resetLink = `https://brillliantacademy.site/login?mode=resetPassword&oobCode=${oobCode}`;

    // 2. Fetch user's name if possible
    let name = 'Student';
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      if (userRecord.displayName) {
        name = userRecord.displayName;
      }
    } catch (e) {}

    // 3. Create our custom branded HTML email
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
          <p style="color: #666666; font-size: 12px;">Ã‚Â© ${new Date().getFullYear()} Brilliant Academy. All rights reserved.</p>
        </div>
      </div>
    `;

    // 4. Send it using Resend
    const data = await resend.emails.send({
      from: 'Brilliant Academy <admin@brillliantacademy.site>',
      to: email,
      subject: 'Reset your password for Brilliant Academy',
      html: htmlContent,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Password reset API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


