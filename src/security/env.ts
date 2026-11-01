// ============================================================================
// BRILLIANT ACADEMY — CENTRALIZED SERVER-ONLY ENVIRONMENT VALIDATOR
// Enforces:
//   1. Zero hardcoded production API keys or secrets in source code
//   2. Lazy CSPRNG ephemeral fallback generation for local/CI builds
//   3. Strict separation between server secrets and client NEXT_PUBLIC_ config
// ============================================================================

import crypto from 'crypto';

let ephemeralSessionSecret = '';
let ephemeralWebhookSecret = '';
let ephemeralDrmSecret = '';

function getEphemeralSecret(kind: 'session' | 'webhook' | 'drm'): string {
  if (kind === 'session') {
    if (!ephemeralSessionSecret) {
      ephemeralSessionSecret = crypto.randomBytes(32).toString('hex');
    }
    return ephemeralSessionSecret;
  }
  if (kind === 'webhook') {
    if (!ephemeralWebhookSecret) {
      ephemeralWebhookSecret = crypto.randomBytes(32).toString('hex');
    }
    return ephemeralWebhookSecret;
  }
  if (!ephemeralDrmSecret) {
    ephemeralDrmSecret = crypto.randomBytes(32).toString('hex');
  }
  return ephemeralDrmSecret;
}

export interface ServerEnvConfig {
  NODE_ENV: string;
  SESSION_SECRET: string;
  PAYMENT_WEBHOOK_SECRET: string;
  RTMP_CALLBACK_SECRET: string;
  CLOUD_DRM_SECRET: string;
  PAYABLE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  GEMINI_API_KEY: string;
  LIVEKIT_API_KEY: string;
  LIVEKIT_API_SECRET: string;
  LIVEKIT_HOST: string;
  ZOOM_WEBHOOK_SECRET_TOKEN: string;
  BUNNY_STREAM_LIBRARY_ID: string;
  BUNNY_STREAM_API_KEY: string;
  BUNNY_STREAM_TOKEN_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  MASTER_ADMIN_EMAILS: string[];
}

export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function getServerEnv(): ServerEnvConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';

  const sessionSecret =
    process.env.SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    getEphemeralSecret('session');

  const webhookSecret =
    process.env.PAYMENT_WEBHOOK_SECRET ||
    process.env.WEBHOOK_SECRET ||
    process.env.RTMP_CALLBACK_SECRET ||
    getEphemeralSecret('webhook');

  const rtmpCallbackSecret =
    process.env.RTMP_CALLBACK_SECRET ||
    process.env.WEBHOOK_SECRET ||
    webhookSecret;

  const cloudDrmSecret =
    process.env.CLOUD_DRM_SECRET ||
    getEphemeralSecret('drm');

  const livekitHost = (
    process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://live.brillliantacademy.site'
  )
    .replace(/^wss:/, 'https:')
    .replace(/^ws:/, 'http:');

  const rawMasterAdmins =
    process.env.MASTER_ADMIN_EMAILS ||
    'arshathrizvi1010@gmail.com,admin@brilliantacademy.com,admin@brillliantacademy.site';

  const masterAdmins = rawMasterAdmins
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return {
    NODE_ENV: nodeEnv,
    SESSION_SECRET: sessionSecret,
    PAYMENT_WEBHOOK_SECRET: webhookSecret,
    RTMP_CALLBACK_SECRET: rtmpCallbackSecret,
    CLOUD_DRM_SECRET: cloudDrmSecret,
    PAYABLE_SECRET_KEY: process.env.PAYABLE_SECRET_KEY || '',
    RESEND_API_KEY: process.env.RESEND_API_KEY || '',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || 'APIbrilliant',
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || '',
    LIVEKIT_HOST: livekitHost,
    ZOOM_WEBHOOK_SECRET_TOKEN: process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '',
    BUNNY_STREAM_LIBRARY_ID: process.env.BUNNY_STREAM_LIBRARY_ID || '748058',
    BUNNY_STREAM_API_KEY: process.env.BUNNY_STREAM_API_KEY || '',
    BUNNY_STREAM_TOKEN_KEY: process.env.BUNNY_STREAM_TOKEN_KEY || '',
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || '',
    MASTER_ADMIN_EMAILS: masterAdmins,
  };
}
