import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { rpID, origin } from '@/lib/passkey-config';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withZeroTrustGate(
  {
    scope: 'passkey_verify_auth',
    limit: 20,
    windowMs: 60 * 1000,
  },
  async (req, ctx) => {
    try {
      const parsed = await parseAndVerifyJsonBody<{ response?: any; challengeId?: string }>(req, ctx);
      if (!parsed.ok) return parsed.response;

      const { response, challengeId } = parsed.body;

      if (!response || !challengeId || typeof challengeId !== 'string' || !/^[0-9a-f]{64}$/i.test(challengeId)) {
        return NextResponse.json({ error: 'Missing or invalid response/challengeId' }, { status: 400 });
      }

      // Retrieve the expected challenge and enforce strict 5-minute TTL
      const challengeDoc = await adminDb.collection('authChallenges').doc(challengeId).get();
      if (!challengeDoc.exists) {
        return NextResponse.json({ error: 'Challenge not found or expired' }, { status: 404 });
      }

      const challengeData = challengeDoc.data() || {};
      const expectedChallenge = challengeData.challenge;
      const challengeCreatedAt = Number(challengeData.createdAt || 0);
      if (!expectedChallenge || !challengeCreatedAt || Date.now() - challengeCreatedAt > 5 * 60 * 1000) {
        await challengeDoc.ref.delete().catch(() => {});
        return NextResponse.json({ error: 'Challenge expired. Please try again.' }, { status: 401 });
      }

      // The userHandle is the uid we encoded during registration
      const uidBytes = response.response?.userHandle;
      if (!uidBytes || typeof uidBytes !== 'string' || uidBytes.length > 256) {
        return NextResponse.json({ error: 'No valid userHandle provided by authenticator' }, { status: 400 });
      }

      // Decode base64url userHandle to get uid and validate against path injection
      const uid = Buffer.from(uidBytes, 'base64url').toString('utf8').trim();
      if (!uid || !/^[a-zA-Z0-9_-]{4,128}$/.test(uid)) {
        return NextResponse.json({ error: 'Invalid user identifier' }, { status: 400 });
      }

      // Reject suspended/banned accounts before authenticating
      const userSnap = await adminDb.collection('users').doc(uid).get();
      if (userSnap.exists && userSnap.data()?.isBanned === true) {
        await challengeDoc.ref.delete().catch(() => {});
        return NextResponse.json({ error: 'Account suspended.' }, { status: 403 });
      }

      // Retrieve the user's credential from Firestore (validate credential ID against path traversal)
      const credentialIDStr = typeof response.id === 'string' ? response.id.trim() : '';
      if (!credentialIDStr || !/^[a-zA-Z0-9_-]{8,512}$/.test(credentialIDStr)) {
        return NextResponse.json({ error: 'Invalid credential identifier' }, { status: 400 });
      }
      const credentialDoc = await adminDb.collection('users').doc(uid).collection('passkeys').doc(credentialIDStr).get();

      if (!credentialDoc.exists) {
        return NextResponse.json({ error: 'Credential not found for this user' }, { status: 404 });
      }

      const credentialData = credentialDoc.data()!;
      const credentialPublicKey = new Uint8Array(Buffer.from(credentialData.credentialPublicKey, 'base64'));

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

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: expectedOrigins,
        expectedRPID: rpID,
        credential: {
          id: credentialIDStr,
          publicKey: credentialPublicKey,
          counter: credentialData.counter,
          transports: credentialData.transports,
        },
      });

      if (verification.verified && verification.authenticationInfo) {
        // Consume the challenge first so concurrent replay attempts fail immediately
        await challengeDoc.ref.delete();

        // Update counter
        await adminDb.collection('users').doc(uid).collection('passkeys').doc(credentialIDStr).update({
          counter: verification.authenticationInfo.newCounter,
        });

        // Mint a custom Firebase token for login
        const customToken = await adminAuth.createCustomToken(uid);

        return NextResponse.json({ verified: true, customToken });
      }

      return NextResponse.json({ verified: false, error: 'Verification failed' }, { status: 400 });
    } catch (error: any) {
      console.error('Error verifying auth:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
);
