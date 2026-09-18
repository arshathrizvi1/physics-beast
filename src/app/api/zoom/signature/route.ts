import { NextResponse } from 'next/server';
import { KJUR } from 'jsrsasign';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { meetingNumber, role } = await req.json();

    if (!meetingNumber) {
      return NextResponse.json({ error: 'meetingNumber is required' }, { status: 400 });
    }

    let sdkKey = process.env.ZOOM_SDK_KEY;
    let sdkSecret = process.env.ZOOM_SDK_SECRET;

    // Fetch from Firebase settings
    try {
      const settingsDoc = await adminDb.collection('settings').doc('zoom').get();
      if (settingsDoc.exists) {
        const data = settingsDoc.data();
        if (data?.sdkKey && data?.sdkSecret) {
          sdkKey = data.sdkKey;
          sdkSecret = data.sdkSecret;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch zoom keys from Firebase:", e);
    }

    if (!sdkKey || !sdkSecret) {
      console.warn("ZOOM_SDK_KEY or ZOOM_SDK_SECRET is missing.");
      return NextResponse.json({ error: 'SDK credentials not configured' }, { status: 500 });
    }

    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2; // 2 hours

    const oHeader = { alg: 'HS256', typ: 'JWT' };

    const oPayload = {
      sdkKey: sdkKey,
      appKey: sdkKey, // Required for some older SDK versions
      mn: meetingNumber,
      role: role || 0, // 0 = attendee, 1 = host
      iat: iat,
      exp: exp,
      tokenExp: exp
    };

    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    const signature = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, sdkSecret);

    return NextResponse.json({ signature, sdkKey });
  } catch (error) {
    console.error('Zoom Signature Error:', error);
    return NextResponse.json({ error: 'Failed to generate Zoom signature' }, { status: 500 });
  }
}
