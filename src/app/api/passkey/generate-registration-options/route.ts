import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics: any = {
    step: 'start',
    nodeVersion: process.version,
    env: {
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasKey: !!process.env.FIREBASE_PRIVATE_KEY,
      keyLen: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
    }
  };

  try {
    diagnostics.step = 'importing-simplewebauthn';
    const webauthn = await import('@simplewebauthn/server');
    diagnostics.webauthnLoaded = typeof webauthn.generateRegistrationOptions === 'function';

    diagnostics.step = 'importing-firebase-admin';
    const fbAdmin = await import('@/lib/firebase-admin');
    diagnostics.fbAdminLoaded = !!fbAdmin.adminDb;

    diagnostics.step = 'importing-passkey-config';
    const config = await import('@/lib/passkey-config');
    diagnostics.rpID = config.rpID;
    diagnostics.rpName = config.rpName;

    return NextResponse.json({ ok: true, diagnostics });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      failedAt: diagnostics.step,
      error: err?.message || String(err),
      stack: err?.stack,
      diagnostics
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { uid, email, displayName } = await req.json();

    if (!uid || !email) {
      return NextResponse.json({ error: 'Missing uid or email' }, { status: 400 });
    }

    const { generateRegistrationOptions } = await import('@simplewebauthn/server');
    const { adminDb } = await import('@/lib/firebase-admin');
    const { rpID, rpName } = await import('@/lib/passkey-config');

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
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
