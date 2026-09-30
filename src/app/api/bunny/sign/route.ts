import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const libraryId = searchParams.get('libraryId') || process.env.BUNNY_STREAM_LIBRARY_ID || '748058';

    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    // --- CLOUD DRM HANDSHAKE VERIFICATION ---
    // The secret key must match the one compiled into the Android C++ engine
    const CLOUD_SECRET_KEY = process.env.CLOUD_DRM_SECRET || 'BrilliantAcademy_SuperSecretKey_2026!$';
    
    const clientSignature = request.headers.get('x-secure-signature');
    const clientTimestamp = request.headers.get('x-timestamp');

    if (!clientSignature || !clientTimestamp) {
      console.warn("BLOCKED: Missing secure headers");
      return NextResponse.json({ error: 'Forbidden: Missing secure handshake' }, { status: 403 });
    }

    // Check for replay attacks (timestamp must be within 5 minutes of server time)
    const currentTime = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(clientTimestamp, 10);
    if (Math.abs(currentTime - requestTime) > 300) {
      console.warn("BLOCKED: Replay attack detected or clock out of sync");
      return NextResponse.json({ error: 'Forbidden: Request expired' }, { status: 403 });
    }

    // Calculate the expected signature
    const expectedSignature = crypto.createHash('sha256').update(CLOUD_SECRET_KEY + videoId + clientTimestamp).digest('hex');

    if (clientSignature !== expectedSignature) {
      console.warn("BLOCKED: Invalid Cloud DRM Signature! Potential hacker.");
      return NextResponse.json({ error: 'Forbidden: Invalid integrity signature' }, { status: 403 });
    }
    // --- END CLOUD DRM VERIFICATION ---


    const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY;

    if (!tokenKey) {
      return NextResponse.json({
        url: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true`
      });
    }

    // Expiration timestamp in seconds (valid for 4 hours)
    const expires = Math.floor(Date.now() / 1000) + 14400;

    // SHA256(token_security_key + video_id + expiration_timestamp)
    const rawSignature = `${tokenKey}${videoId}${expires}`;
    const token = crypto.createHash('sha256').update(rawSignature).digest('hex');

    const signedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}&autoplay=true`;
    
    // For Native Android ExoPlayer
    const hlsUrl = `https://vz-7422f6bf-7e4.b-cdn.net/${videoId}/playlist.m3u8?token=${token}&expires=${expires}`;

    return NextResponse.json({ url: signedUrl, hlsUrl, token, expires });
  } catch (error: any) {
    console.error('Bunny Token Sign Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
