import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { rpID, origin } from '@/lib/passkey-config';

export async function POST(req: Request) {
  try {
    const { response, challengeId } = await req.json();

    if (!response || !challengeId) {
      return NextResponse.json({ error: 'Missing response or challengeId' }, { status: 400 });
    }

    // Retrieve the expected challenge
    const challengeDoc = await adminDb.collection('authChallenges').doc(challengeId).get();
    if (!challengeDoc.exists) {
      return NextResponse.json({ error: 'Challenge not found or expired' }, { status: 404 });
    }

    const expectedChallenge = challengeDoc.data()?.challenge;
    
    // The userHandle is the uid we encoded during registration
    const uidBytes = response.response.userHandle;
    if (!uidBytes) {
      return NextResponse.json({ error: 'No userHandle provided by authenticator' }, { status: 400 });
    }
    
    // Decode base64url userHandle to get uid
    const uid = Buffer.from(uidBytes, 'base64url').toString('utf8');

    // Retrieve the user's credential from Firestore
    const credentialIDStr = response.id;
    const credentialDoc = await adminDb.collection(`users/${uid}/passkeys`).doc(credentialIDStr).get();
    
    if (!credentialDoc.exists) {
      return NextResponse.json({ error: 'Credential not found for this user' }, { status: 404 });
    }

    const credentialData = credentialDoc.data()!;
    const credentialPublicKey = new Uint8Array(Buffer.from(credentialData.credentialPublicKey, 'base64'));

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(credentialIDStr, 'base64url'),
        credentialPublicKey,
        counter: credentialData.counter,
        transports: credentialData.transports,
      },
    });

    if (verification.verified && verification.authenticationInfo) {
      // Update counter
      await adminDb.collection(`users/${uid}/passkeys`).doc(credentialIDStr).update({
        counter: verification.authenticationInfo.newCounter,
      });

      // Clear the used challenge
      await challengeDoc.ref.delete();

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
