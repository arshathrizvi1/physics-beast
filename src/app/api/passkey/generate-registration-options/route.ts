import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { adminDb } from '@/lib/firebase-admin';
import { rpID, rpName } from '@/lib/passkey-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
    const hasEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
    const hasKey = !!process.env.FIREBASE_PRIVATE_KEY;
    const keyLen = process.env.FIREBASE_PRIVATE_KEY?.length || 0;
    return NextResponse.json({
      status: 'ok',
      hasProjectId,
      hasEmail,
      hasKey,
      keyLen,
      rpID,
      rpName,
      nodeVersion: process.version,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { uid, email, displayName } = await req.json();

    if (!uid || !email) {
      return NextResponse.json({ error: 'Missing uid or email' }, { status: 400 });
    }

    // Retrieve any existing authenticators for this user to exclude them
    const passkeysSnapshot = await adminDb.collection(`users/${uid}/passkeys`).get();
    const excludeCredentials = passkeysSnapshot.docs.map(doc => {
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

    // Save the challenge in the user's document for verification later
    await adminDb.collection('users').doc(uid).set(
      { currentChallenge: options.challenge },
      { merge: true }
    );

    return NextResponse.json(options);
  } catch (error: any) {
    console.error('Error generating registration options:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
