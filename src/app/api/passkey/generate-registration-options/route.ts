import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { adminDb } from '@/lib/firebase-admin';
import { rpID, rpName } from '@/lib/passkey-config';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { sanitizeText } from '@/security/sanitize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withZeroTrustGate(
  {
    scope: 'passkey_generate_registration',
    limit: 10,
    windowMs: 60 * 1000,
    requireAuth: 'authenticated',
  },
  async (req, ctx) => {
    try {
      const parsed = await parseAndVerifyJsonBody<{
        uid?: string;
        email?: string;
        displayName?: string;
      }>(req, ctx);
      if (!parsed.ok) return parsed.response;

      const uid = sanitizeText(parsed.body.uid, 128);
      const email = sanitizeText(parsed.body.email, 128);
      const displayName = sanitizeText(parsed.body.displayName || '', 128);

      if (!uid || !email) {
        return NextResponse.json({ error: 'Missing uid or email' }, { status: 400 });
      }

      // Security Check: Caller MUST match target UID (prevents Account Takeover)
      if (!ctx.caller || ctx.caller.uid !== uid) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot register passkey for another user account' },
          { status: 403 }
        );
      }

      // Retrieve any existing authenticators for this user to exclude them
      const passkeysSnapshot = await adminDb.collection(`users/${uid}/passkeys`).get();
      const excludeCredentials = passkeysSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.credentialID,
          type: 'public-key' as const,
          transports: data.transports,
        };
      });

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: new TextEncoder().encode(uid),
        userName: email,
        userDisplayName: displayName || email,
        attestationType: 'none',
        excludeCredentials,
        authenticatorSelection: {
          residentKey: 'required',
          userVerification: 'preferred',
        },
      });

      // Save challenge in user's document for cryptographic verification
      await adminDb.collection('users').doc(uid).set(
        { currentChallenge: options.challenge },
        { merge: true }
      );

      return NextResponse.json(options);
    } catch (error: any) {
      console.error('Error generating registration options:', error);
      return NextResponse.json({ error: error?.message || 'Failed to generate options' }, { status: 500 });
    }
  }
);
