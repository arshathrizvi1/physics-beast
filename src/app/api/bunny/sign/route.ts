import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerEnv } from '@/security/env';
import { timingSafeEqualStr } from '@/security/session';
import { withZeroTrustGate } from '@/security/zero-trust-gate';
import { sanitizeText } from '@/security/sanitize';

// Runtime XOR-decoded fallback matching the native C++ JNI key array
const NATIVE_XOR_KEY_BYTES = [
  104, 88, 67, 70, 70, 67, 75, 68, 94, 107, 73, 75, 78, 79, 71, 83, 117, 121,
  95, 90, 79, 88, 121, 79, 73, 88, 79, 94, 97, 79, 83, 117, 24, 26, 24, 28, 11, 14,
];

function resolveNativeCloudDrmKey(): string {
  const envKey = process.env.CLOUD_DRM_SECRET;
  if (envKey) return envKey;
  return NATIVE_XOR_KEY_BYTES.map((b) => String.fromCharCode(b ^ 42)).join('');
}

export const GET = withZeroTrustGate(
  {
    scope: 'bunny_video_sign',
    limit: 60,
    windowMs: 60 * 1000,
  },
  async (request) => {
    const env = getServerEnv();
    const { searchParams } = new URL(request.url);
    const videoId = sanitizeText(searchParams.get('videoId'), 128);
    const libraryId =
      sanitizeText(searchParams.get('libraryId'), 64) || env.BUNNY_STREAM_LIBRARY_ID;

    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    // --- CLOUD DRM HANDSHAKE VERIFICATION ---
    const CLOUD_SECRET_KEY = resolveNativeCloudDrmKey();

    const clientSignature = request.headers.get('x-secure-signature');
    const clientTimestamp = request.headers.get('x-timestamp');
    const appPlatform = request.headers.get('x-app-platform');

    if (appPlatform === 'android') {
      if (!clientSignature || !clientTimestamp) {
        return NextResponse.json(
          { error: 'Forbidden: Missing secure handshake' },
          { status: 403 }
        );
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const requestTime = parseInt(clientTimestamp, 10);
      if (!Number.isFinite(requestTime) || Math.abs(currentTime - requestTime) > 300) {
        return NextResponse.json(
          { error: 'Forbidden: Request expired' },
          { status: 403 }
        );
      }

      const expectedSignature = crypto
        .createHash('sha256')
        .update(CLOUD_SECRET_KEY + videoId + clientTimestamp)
        .digest('hex');

      if (!timingSafeEqualStr(clientSignature, expectedSignature)) {
        return NextResponse.json(
          { error: 'Forbidden: Invalid integrity signature' },
          { status: 403 }
        );
      }
    }
    // --- END CLOUD DRM VERIFICATION ---

    const tokenKey = env.BUNNY_STREAM_TOKEN_KEY;

    if (!tokenKey) {
      return NextResponse.json({
        url: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true`,
      });
    }

    const expires = Math.floor(Date.now() / 1000) + 14400;
    const rawSignature = `${tokenKey}${videoId}${expires}`;
    const token = crypto.createHash('sha256').update(rawSignature).digest('hex');

    const signedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}&autoplay=true`;
    const hlsUrl = `https://vz-7422f6bf-7e4.b-cdn.net/${videoId}/playlist.m3u8?token=${token}&expires=${expires}`;

    return NextResponse.json({ url: signedUrl, hlsUrl, token, expires });
  }
);
