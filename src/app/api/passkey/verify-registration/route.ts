import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { adminDb } from '@/lib/firebase-admin';
import { rpID, origin } from '@/lib/passkey-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { uid, response } = await req.json();

    if (!uid || !response) {
      return NextResponse.json({ error: 'Missing uid or response' }, { status: 400 });
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
      ...origin,
      // The base64url encoded sha256 fingerprint (what Android actually sends!)
      'android:apk-key-hash:7viLPxh4pyDq9NQNu0OnVxepwqqGvBsWp6n6adCA0_I',
      // The exact lowercased sha256 fingerprint WITHOUT colons (fallback)
      'android:apk-key-hash:eef88b3f1878a720eaf4d40dbb43a75717a9c2aa86bc1b16a7a9fa69d080d3f2',
      'android:apk-key-hash:EEF88B3F1878A720EAF4D40DBB43A75717A9C2AA86BC1B16A7A9FA69D080D3F2'
    ];

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      // Save the new passkey credential in Firestore
      const credentialStr = Buffer.from(credential.publicKey).toString('base64');
      const credentialIDStr = credential.id;

      await adminDb.collection(`users/${uid}/passkeys`).doc(credentialIDStr).set({
        credentialID: credentialIDStr,
        credentialPublicKey: credentialStr,
        counter: credential.counter,
        credentialDeviceType,
        credentialBackedUp,
        transports: credential.transports || response.response.transports || [],
        createdAt: new Date().toISOString(),
      });

      // Clear the challenge
      await adminDb.collection('users').doc(uid).update({
        currentChallenge: null,
      });

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ verified: false, error: 'Verification failed' }, { status: 400 });
  } catch (error: any) {
    console.error('Error verifying registration:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
