import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { adminDb } from '@/lib/firebase-admin';
import { rpID, origin } from '@/lib/passkey-config';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { sanitizeText } from '@/security/sanitize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withZeroTrustGate(
  {
    scope: 'passkey_verify_registration',
    limit: 10,
    windowMs: 60 * 1000,
    requireAuth: 'authenticated',
  },
  async (req, ctx) => {
    try {
      const parsed = await parseAndVerifyJsonBody<{
        uid?: string;
        response?: any;
      }>(req, ctx);
      if (!parsed.ok) return parsed.response;

      const uid = sanitizeText(parsed.body.uid, 128);
      const response = parsed.body.response;

      if (!uid || !response) {
        return NextResponse.json({ error: 'Missing uid or response' }, { status: 400 });
      }

      // Security Check: Caller MUST match target UID (prevents Account Takeover)
      if (!ctx.caller || ctx.caller.uid !== uid) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot bind credentials to another user account' },
          { status: 403 }
        );
      }

      // Retrieve the expected challenge from the user's document
      const userDoc = await adminDb.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userData = userDoc.data();
      const expectedChallenge = userData?.currentChallenge;

      if (!expectedChallenge) {
        return NextResponse.json({ error: 'No active challenge found for user' }, { status: 400 });
      }

      const expectedOrigins = [
        'android:apk-key-hash:LVpJceSiciBSkcTsTyhTX8Z_1WFOBs5YhWg2fmL0ZsQ',
        ...origin,
        'android:apk-key-hash:f7b9eTX3IGGpLqlBHINGPYd1uGlmxRJUH_mUUZWejYA',
        'android:apk-key-hash:BUAmTVxIv5_l8b-kstpHWDPDCx-X8VT-wmGqfvGUJDQ',
        'android:apk-key-hash:7FB6FD7935F72061A92EA9411E53463D8775B86226C512541FF99451959E2660',
        'android:apk-key-hash:7fb6fd7935f72061a92ea9411e53463d8775b86226c512541ff99451959e2660',
        'android:apk-key-hash:7viLPxh4pyDq9NQNu0OnVxepwqqGvBsWp6n6adCA0_I',
        'android:apk-key-hash:eef88b3f1878a720eaf4d40dbb43a75717a9c2aa86bc1b16a7a9fa69d080d3f2',
        'android:apk-key-hash:EEF88B3F1878A720EAF4D40DBB43A75717A9C2AA86BC1B16A7A9FA69D080D3F2',
      ];

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: expectedOrigins,
        expectedRPID: rpID,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credential, credentialDeviceType, credentialBackedUp } =
          verification.registrationInfo;

        const credentialStr = Buffer.from(credential.publicKey).toString('base64');
        const credentialIDStr = credential.id;

        await adminDb.collection(`users/${uid}/passkeys`).doc(credentialIDStr).set({
          credentialID: credentialIDStr,
          credentialPublicKey: credentialStr,
          counter: credential.counter,
          credentialDeviceType,
          credentialBackedUp,
          transports: credential.transports || response.response?.transports || [],
          createdAt: new Date().toISOString(),
        });

        // Clear challenge
        await adminDb.collection('users').doc(uid).update({
          currentChallenge: null,
        });

        return NextResponse.json({ verified: true });
      }

      return NextResponse.json({ verified: false, error: 'Verification failed' }, { status: 400 });
    } catch (error: any) {
      console.error('Error verifying registration:', error);
      return NextResponse.json({ error: error.message || 'Verification error' }, { status: 500 });
    }
  }
);
