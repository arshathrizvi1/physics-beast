// ============================================================================
// SERVER-SIDE ZERO-TRUST 5-MINUTE OTP & STRONG PASSWORD AUTHORITY
// Enforces:
//   - Strict 5-Minute (300s) TTL for Email Verification & Password Reset OTPs
//   - CSPRNG Rejection-Sampled 6-Digit OTPs generated strictly on the Server
//   - HMAC-SHA256 Hashed OTP Storage (Zero Plaintext OTPs stored in DB)
//   - Single-Use Consumption + Max 5 Brute-Force Attempt Lockout
// ============================================================================

import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { sanitizeEmail } from './sanitize';
import { getServerEnv } from './env';
import { timingSafeEqualStr } from './session';

export const OTP_TTL_MS = 5 * 60 * 1000; // Strictly 5 minutes (300,000 ms)
export const OTP_TTL_SECONDS = 300;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;

const ALLOWED_PURPOSES = new Set(['verify_email', 'reset_password']);

interface OtpChallengeRecord {
  challengeKey: string;
  email: string;
  purpose: string;
  otpHash: string;
  expiresAt: number;
  attempts: number;
  consumed: boolean;
  createdAt: number;
}

const memoryOtpStore = new Map<string, OtpChallengeRecord>();

/**
 * Generates an unbiased 6-digit OTP (100000..999999) via CSPRNG rejection sampling.
 */
export function generateSixDigitOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

function computeOtpHmac(email: string, purpose: string, code: string): string {
  const env = getServerEnv();
  return crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(`${email}|${purpose}|${code}`, 'utf8')
    .digest('hex');
}

export function validateStrongPassword(password: unknown): {
  valid: boolean;
  error?: string;
} {
  const pw = String(password || '');
  if (pw.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (pw.length > 128) {
    return { valid: false, error: 'Password must not exceed 128 characters.' };
  }
  if (!/[A-Z]/.test(pw)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(pw)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(pw)) {
    return { valid: false, error: 'Password must contain at least one number (0-9).' };
  }
  return { valid: true };
}

/**
 * Issues a new 6-digit OTP valid for strictly 5 minutes (300 seconds).
 */
export async function issueServerOtp(params: {
  email: unknown;
  purpose: string;
}): Promise<{
  ok: boolean;
  status?: number;
  error?: string;
  code?: string;
  email?: string;
  purpose?: string;
  expiresAt?: number;
  expiresInSeconds?: number;
}> {
  const cleanEmail = sanitizeEmail(params.email);
  if (!cleanEmail) {
    return { ok: false, status: 400, error: 'Please enter a valid email address.' };
  }
  if (!ALLOWED_PURPOSES.has(params.purpose)) {
    return { ok: false, status: 400, error: 'Invalid OTP purpose.' };
  }

  const now = Date.now();
  const challengeKey = `${cleanEmail}:${params.purpose}`;
  const existing = memoryOtpStore.get(challengeKey);

  if (
    existing &&
    !existing.consumed &&
    existing.expiresAt > now &&
    now - existing.createdAt < OTP_RESEND_COOLDOWN_MS
  ) {
    const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.createdAt)) / 1000);
    return {
      ok: false,
      status: 429,
      error: `Please wait ${waitSec}s before requesting another OTP code.`,
    };
  }

  const code = generateSixDigitOtp();
  const expiresAt = now + OTP_TTL_MS;
  const otpHash = computeOtpHmac(cleanEmail, params.purpose, code);

  const record: OtpChallengeRecord = {
    challengeKey,
    email: cleanEmail,
    purpose: params.purpose,
    otpHash,
    expiresAt,
    attempts: 0,
    consumed: false,
    createdAt: now,
  };

  memoryOtpStore.set(challengeKey, record);

  try {
    await adminDb.collection('otp_verifications').doc(challengeKey).set(record);
  } catch {
    // Non-fatal if Firestore write falls back to memory store
  }

  return {
    ok: true,
    code,
    email: cleanEmail,
    purpose: params.purpose,
    expiresAt,
    expiresInSeconds: OTP_TTL_SECONDS,
  };
}

/**
 * Verifies and atomically consumes a 6-digit OTP within the strict 5-minute window.
 */
export async function verifyAndConsumeServerOtp(params: {
  email: unknown;
  purpose: string;
  code: unknown;
}): Promise<{
  valid: boolean;
  status: number;
  error?: string;
  email?: string;
}> {
  const cleanEmail = sanitizeEmail(params.email);
  const cleanCode = String(params.code || '').trim().replace(/\D/g, '');

  if (!cleanEmail) {
    return { valid: false, status: 400, error: 'Valid email address is required.' };
  }
  if (!ALLOWED_PURPOSES.has(params.purpose)) {
    return { valid: false, status: 400, error: 'Invalid OTP purpose.' };
  }
  if (cleanCode.length !== 6) {
    return { valid: false, status: 400, error: 'Please enter a valid 6-digit OTP code.' };
  }

  const challengeKey = `${cleanEmail}:${params.purpose}`;
  const now = Date.now();

  let record = memoryOtpStore.get(challengeKey) || null;
  if (!record) {
    try {
      const snap = await adminDb.collection('otp_verifications').doc(challengeKey).get();
      if (snap.exists) {
        record = snap.data() as OtpChallengeRecord;
      }
    } catch {
      // Fallback to memory
    }
  }

  if (!record || record.consumed) {
    return {
      valid: false,
      status: 400,
      error: 'No active OTP found or code was already used. Please request a new 6-digit OTP.',
    };
  }

  if (now > record.expiresAt) {
    record.consumed = true;
    memoryOtpStore.set(challengeKey, record);
    return {
      valid: false,
      status: 400,
      error: 'This OTP code has expired (5-minute limit). Please request a new code.',
    };
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    record.consumed = true;
    memoryOtpStore.set(challengeKey, record);
    return {
      valid: false,
      status: 429,
      error: 'Too many incorrect attempts. Please request a new 6-digit OTP.',
    };
  }

  const expectedHash = computeOtpHmac(cleanEmail, params.purpose, cleanCode);
  if (!timingSafeEqualStr(record.otpHash, expectedHash)) {
    record.attempts += 1;
    memoryOtpStore.set(challengeKey, record);
    const remaining = Math.max(0, OTP_MAX_ATTEMPTS - record.attempts);
    return {
      valid: false,
      status: 401,
      error: `Invalid OTP code. ${remaining} attempt(s) remaining.`,
    };
  }

  record.consumed = true;
  memoryOtpStore.set(challengeKey, record);
  try {
    await adminDb.collection('otp_verifications').doc(challengeKey).update({ consumed: true });
  } catch {
    // Ignore
  }

  return {
    valid: true,
    status: 200,
    email: cleanEmail,
  };
}
