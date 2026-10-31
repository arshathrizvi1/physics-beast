// ============================================================================
// STRICT ZERO-TRUST SCHEMA VALIDATORS & HONEYPOT TAMPER TRAP
// Rejects unknown/forbidden fields, strips XSS/HTML tags, enforces numeric bounds,
// and detects privilege/price tampering attempts (Honeypot fields).
// ============================================================================

import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizePayload } from './sanitize';

export const HONEYPOT_FORBIDDEN_FIELDS = new Set([
  'isAdmin',
  'adminOverride',
  'bypassAuth',
  'paymentVerified',
  'forcePaid',
  'overridePrice',
  'tamperedAmount',
  'rawSql',
  '_honeypot',
  '__proto__',
  'constructor',
  'prototype',
]);

/**
 * Deeply scans a parsed JSON body for honeypot or privilege-escalation fields.
 */
export function detectHoneypotTampering(obj: unknown, depth = 0): string | null {
  if (!obj || typeof obj !== 'object' || depth > 5) return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const hit = detectHoneypotTampering(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }

  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (HONEYPOT_FORBIDDEN_FIELDS.has(key)) {
      return `FORBIDDEN_FIELD:${key}`;
    }
    if (val && typeof val === 'object') {
      const nested = detectHoneypotTampering(val, depth + 1);
      if (nested) return nested;
    }
  }
  return null;
}

/**
 * Validates Payable checkout creation payloads and blocks negative/zero price tampering.
 */
export function validatePayableCheckoutPayload(rawBody: unknown): {
  valid: boolean;
  honeypot?: boolean;
  reason?: string;
  error?: string;
  data?: {
    courseId: string;
    folderId: string;
    courseName: string;
    clientSubmittedPrice: number;
    userId: string;
    userEmail: string;
    userPhone: string;
    studentId: string;
    userName: string;
  };
} {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return { valid: false, error: 'Invalid checkout request payload.' };
  }

  const honeypot = detectHoneypotTampering(rawBody);
  if (honeypot) {
    return { valid: false, honeypot: true, reason: honeypot };
  }

  const body = rawBody as Record<string, unknown>;
  const rawPrice = Number(body.price);

  if (
    body.quantity !== undefined &&
    (!Number.isInteger(Number(body.quantity)) ||
      Number(body.quantity) < 1 ||
      Number(body.quantity) > 20)
  ) {
    return {
      valid: false,
      honeypot: true,
      reason: 'NEGATIVE_OR_EXCESSIVE_QUANTITY_TAMPERING',
    };
  }

  if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
    return {
      valid: false,
      honeypot: rawPrice < 0,
      reason: rawPrice < 0 ? 'NEGATIVE_PRICE_TAMPERING' : 'INVALID_PRICE',
      error: 'Course price must be a positive amount.',
    };
  }

  const courseId = sanitizeText(body.courseId, 100);
  const folderId = sanitizeText(body.folderId, 100);
  const userId = sanitizeText(body.userId, 100);

  if (!courseId || !folderId || !userId) {
    return { valid: false, error: 'Missing required courseId, folderId, or userId.' };
  }

  return {
    valid: true,
    data: {
      courseId,
      folderId,
      courseName: sanitizeText(body.courseName || 'Brilliant Academy Course', 150),
      clientSubmittedPrice: rawPrice,
      userId,
      userEmail: sanitizeEmail(body.userEmail) || 'student@brillliantacademy.site',
      userPhone: sanitizePhone(body.userPhone),
      studentId: sanitizeText(body.studentId, 50),
      userName: sanitizeText(body.userName || 'Student', 100),
    },
  };
}

/**
 * Validates file upload presigned URL requests (MIME allowlist + path traversal guard).
 */
export function validatePresignedUploadPayload(rawBody: unknown): {
  valid: boolean;
  honeypot?: boolean;
  reason?: string;
  error?: string;
  data?: {
    filename: string;
    contentType: string;
    folder: string;
  };
} {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return { valid: false, error: 'Invalid upload payload.' };
  }

  const honeypot = detectHoneypotTampering(rawBody);
  if (honeypot) {
    return { valid: false, honeypot: true, reason: honeypot };
  }

  const body = rawBody as Record<string, unknown>;
  const rawFilename = sanitizeText(body.filename, 200);
  const rawContentType = sanitizeText(body.contentType, 100).toLowerCase();
  const rawFolder = sanitizeText(body.folder || 'uploads', 64);

  if (!rawFilename || !rawContentType) {
    return { valid: false, error: 'Filename and contentType are required.' };
  }

  // Block path traversal sequences
  if (
    rawFilename.includes('..') ||
    rawFolder.includes('..') ||
    rawFolder.startsWith('/') ||
    rawFolder.includes('\\')
  ) {
    return {
      valid: false,
      honeypot: true,
      reason: 'PATH_TRAVERSAL_ATTEMPT',
      error: 'Invalid file or folder path.',
    };
  }

  const allowedMimePrefixes = ['image/', 'video/', 'audio/', 'application/pdf', 'application/octet-stream'];
  const isAllowedMime = allowedMimePrefixes.some((prefix) => rawContentType.startsWith(prefix));
  if (!isAllowedMime) {
    return { valid: false, error: 'Unsupported file contentType.' };
  }

  // Block executable extensions (.exe, .sh, .php, .jsp, .bat, .cmd, .html, .svg)
  if (/\.(exe|sh|bat|cmd|php|jsp|asp|aspx|cgi|pl|py|rb|html|htm|svg)$/i.test(rawFilename)) {
    return {
      valid: false,
      honeypot: true,
      reason: 'EXECUTABLE_UPLOAD_BLOCKED',
      error: 'Executable or script file extensions are prohibited.',
    };
  }

  const cleanFolder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '_') || 'uploads';

  return {
    valid: true,
    data: {
      filename: rawFilename,
      contentType: rawContentType,
      folder: cleanFolder,
    },
  };
}

export { sanitizePayload };
