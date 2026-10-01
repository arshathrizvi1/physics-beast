import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    if (!code) return NextResponse.json({ error: 'No code provided' }, { status: 400 });

    const settingsDoc = await adminDb.collection('settings').doc('zoom').get();
    const sdkKey = settingsDoc.data()?.sdkKey;
    const sdkSecret = settingsDoc.data()?.sdkSecret;

    if (!sdkKey || !sdkSecret) {
      return NextResponse.json({ error: 'Zoom credentials missing in Firebase' }, { status: 500 });
    }

    const tokenUrl = 'https://zoom.us/oauth/token';
    const redirectUri = 'https://brillliantacademy.site';
    const basicAuth = Buffer.from(`${sdkKey}:${sdkSecret}`).toString('base64');

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    const data = await res.json();
    if (!res.ok) {
        console.error("Zoom OAuth error:", data);
        return NextResponse.json({ error: data.reason || 'OAuth failed' }, { status: 400 });
    }

    await adminDb.collection('settings').doc('zoom').set({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiresAt: Date.now() + (data.expires_in * 1000),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Zoom OAuth Exception:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
