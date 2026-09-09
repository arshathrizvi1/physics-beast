import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { adminDb } from '@/lib/firebase-admin';
import { rpID } from '@/lib/passkey-config';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
    });

    // Store the challenge temporarily with a 5-minute expiration
    const challengeId = crypto.randomBytes(32).toString('hex');
    await adminDb.collection('authChallenges').doc(challengeId).set({
      challenge: options.challenge,
      createdAt: new Date().getTime(),
    });

    return NextResponse.json({ options, challengeId });
  } catch (error: any) {
    console.error('Error generating auth options:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
