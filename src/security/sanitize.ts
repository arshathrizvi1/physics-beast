// ============================================================================
// ZERO-TRUST INPUT SANITIZATION & ANTI-XSS ENGINE
// Strips HTML/script tags, dangerous protocols, null bytes, and prototype keys.
// ============================================================================

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Strips all HTML tags, script injections, javascript:/data: URIs, and control chars.
 */
export function sanitizeText(input: unknown, maxLength = 2000): string {
  if (input === null || input === undefined) return '';
  let str = String(input);

  // Remove null bytes and non-printable control characters (except newline/tab)
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Strip <script>...</script> and <style>...</style> blocks completely
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  str = str.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Strip all remaining HTML tags
  str = str.replace(/<\/?[a-zA-Z][^>]*>/g, '');

  // Neutralize javascript: and vbscript: URI schemes
  str = str.replace(/\b(?:javascript|vbscript|data:text\/html)\s*:/gi, 'blocked:');

  return str.trim().slice(0, maxLength);
}

/**
 * Sanitizes an email address into lowercase canonical format.
 */
export function sanitizeEmail(input: unknown): string {
  const clean = sanitizeText(input, 254).toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(clean) ? clean : '';
}

/**
 * Sanitizes a phone number, allowing only digits, +, -, spaces, and parentheses.
 */
export function sanitizePhone(input: unknown): string {
  const clean = sanitizeText(input, 32).replace(/[^0-9+\-() ]/g, '');
  return clean.trim();
}

/**
 * Recursively sanitizes all strings inside a plain object or array while
 * blocking prototype-pollution keys (__proto__, constructor, prototype).
 */
export function sanitizePayload(value: unknown, depth = 0): unknown {
  if (depth > 8) return null;
  if (typeof value === 'string') {
    return sanitizeText(value, 5000);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'boolean' || value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizePayload(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (DANGEROUS_KEYS.has(k)) continue;
      out[sanitizeText(k, 100)] = sanitizePayload(v, depth + 1);
    }
    return out;
  }
  return null;
}
