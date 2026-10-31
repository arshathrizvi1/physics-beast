import { NextResponse } from 'next/server';
import { getServerEnv } from '@/security/env';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { sanitizeText } from '@/security/sanitize';

export const POST = withZeroTrustGate(
  {
    scope: 'live_convert_youtube',
    limit: 15,
    windowMs: 60 * 1000,
  },
  async (request, ctx) => {
    const parsed = await parseAndVerifyJsonBody<{
      url?: string;
      streamKey?: string;
      password?: string;
    }>(request, ctx);
    if (!parsed.ok) return parsed.response;

    const url = sanitizeText(parsed.body.url, 500);
    const streamKey = sanitizeText(parsed.body.streamKey, 128);
    const password = sanitizeText(parsed.body.password || '', 128);

    if (!url || !streamKey) {
      return NextResponse.json({ error: 'Missing url or streamKey' }, { status: 400 });
    }

    const env = getServerEnv();
    const serverHost = process.env.NEXT_PUBLIC_RTMP_SERVER_HOST || '13.60.252.104';
    const serverPort = process.env.RTMP_HTTP_PORT || '8000';
    const callbackSecret = env.RTMP_CALLBACK_SECRET;

    const awsUrl = `http://${serverHost}:${serverPort}/api/convert-youtube`;

    const res = await fetch(awsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        streamKey,
        password,
        secret: callbackSecret,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `AWS server error: ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  }
);
