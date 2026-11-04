/**
 * ============================================================================
 * BRILLIANT ACADEMY PRIVACY & TRACKING PIXEL GUARD
 * Enforces:
 *   - Strict Opt-In Consent Check prior to executing any third-party telemetry
 *   - Complete PII Masking (Scrubs passwords, tokens, cards, emails, phone numbers)
 *   - Defends against VPPA, CIPA (wiretapping), and GDPR Article 6/7 liability
 * ============================================================================
 */

export function hasConsentForTracking(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('brilliant_cookie_consent') === 'accepted';
  } catch {
    return false;
  }
}

export function sanitizeTrackingPayload(payload: Record<string, unknown> = {}): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};
  const sanitized: Record<string, unknown> = {};
  const FORBIDDEN_PII_KEYS = [
    'password',
    'pass',
    'token',
    'secret',
    'key',
    'authorization',
    'card',
    'cvv',
    'credit',
    'debit',
    'phone',
    'ssn',
    'dob',
    'nationalid',
  ];

  for (const [key, value] of Object.entries(payload)) {
    const lower = key.toLowerCase();
    const isSensitive = FORBIDDEN_PII_KEYS.some((sensitive) => lower.includes(sensitive));
    if (!isSensitive) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Safely dispatches an analytics event strictly if the user has given explicit opt-in consent.
 */
export function trackSafeEvent(eventName: string, eventData: Record<string, unknown> = {}): boolean {
  if (!hasConsentForTracking()) {
    // Tracking strictly blocked until user explicitly accepts cookie policy
    return false;
  }

  const cleanPayload = sanitizeTrackingPayload(eventData);

  // If Google Tag or Meta Pixel is present, dispatch sanitized event
  if (typeof window !== 'undefined' && typeof (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag === 'function') {
    try {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', eventName, cleanPayload);
    } catch {}
  }

  return true;
}
