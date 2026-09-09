import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { adminDb } from '@/lib/firebase-admin';
import { rpID, origin } from '@/lib/passkey-config';

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

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      // Save the new passkey credential in Firestore
      const credentialStr = Buffer.from(credentialPublicKey).toString('base64');
      const credentialIDStr = Buffer.from(credentialID).toString('base64');

      await adminDb.collection(`users/${uid}/passkeys`).doc(credentialIDStr).set({
        credentialID: credentialIDStr,
        credentialPublicKey: credentialStr,
        counter,
        credentialDeviceType,
        credentialBackedUp,
        transports: response.response.transports || [],
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
