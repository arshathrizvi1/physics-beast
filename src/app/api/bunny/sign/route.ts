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

    const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY;

    // If no token key is configured, return the standard embed URL without token
    if (!tokenKey) {
      return NextResponse.json({
        url: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true`
      });
    }

    // Expiration timestamp in seconds (valid for 24 hours)
    const expires = Math.floor(Date.now() / 1000) + 86400;

    // SHA256(token_security_key + video_id + expiration_timestamp)
    const rawSignature = `${tokenKey}${videoId}${expires}`;
    const token = crypto.createHash('sha256').update(rawSignature).digest('hex');

    const signedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}&autoplay=true`;

    return NextResponse.json({ url: signedUrl, expires });
  } catch (error: any) {
    console.error('Bunny Token Sign Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
