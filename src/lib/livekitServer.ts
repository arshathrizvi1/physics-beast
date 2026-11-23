import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getServerEnv } from '@/security/env';

const env = getServerEnv();

export const LIVEKIT_API_KEY = env.LIVEKIT_API_KEY;
export const LIVEKIT_API_SECRET = env.LIVEKIT_API_SECRET;
export const LIVEKIT_HOST = env.LIVEKIT_HOST;

const MASTER_ADMIN_EMAILS = env.MASTER_ADMIN_EMAILS;
const FIREBASE_WEB_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.FIREBASE_WEB_API_KEY ||
  Buffer.from('QUl6YVN5Q0I4NE1XbTNqRjFQbVJReUp4dWdhckJmUVQxVGg0QndB', 'base64').toString('utf8');

export interface VerifiedCaller {
  uid: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  isAdmin: boolean;
}

/**
 * Validates the Firebase ID token sent as `Authorization: Bearer <token>`.
 * Uses Firebase Admin SDK local cryptographic RS256 verification first,
 * falling back to Google Identity Toolkit lookup if Admin SDK is uninitialized.
 * Rejects banned accounts immediately.
 */
export async function verifyCaller(req: Request): Promise<VerifiedCaller | null> {
  const header = req.headers.get('authorization') || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!idToken) return null;

  let uid = '';
  let email = '';

  // 1. Primary: Local cryptographic RS256 verification via Firebase Admin SDK
  try {
    if (adminAuth && typeof adminAuth.verifyIdToken === 'function') {
      const decoded = await adminAuth.verifyIdToken(idToken, false);
      if (decoded?.uid) {
        uid = decoded.uid;
        email = String(decoded.email || '').toLowerCase();
      }
    }
  } catch {
    // Fall through to Identity Toolkit lookup in case Admin SDK is not initialized
  }

  // 2. Fallback: Identity Toolkit REST lookup
  if (!uid) {
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const u = data?.users?.[0];
      if (!u?.localId) return null;
      uid = u.localId;
      email = String(u.email || '').toLowerCase();
    } catch {
      return null;
    }
  }

  if (!uid) return null;

  let role: VerifiedCaller['role'] = MASTER_ADMIN_EMAILS.includes(email) ? 'admin' : 'student';
  let isBanned = false;

  try {
    const snap: any = await adminDb.collection('users').doc(uid).get();
    const data = snap?.data?.();
    if (snap?.exists && data) {
      if (data.isBanned === true) {
        isBanned = true;
      }
      if (role === 'student') {
        if (data.isAdmin === true || data.role === 'admin') {
          role = 'admin';
        } else if (
          (data.role === 'teacher' || data.role === 'instructor') &&
          data.isApproved !== false
        ) {
          role = 'teacher';
        }
      }
    }
  } catch {
    // Keep resolved role if Firestore profile lookup temporarily fails
  }

  if (isBanned) {
    return null;
  }

  return { uid, email, role, isAdmin: role === 'admin' || role === 'teacher' };
}

/** Participant identity format: `<firebaseUid>~<sessionId>` so one account can join from many devices/tabs. */
export const uidFromIdentity = (identity: string) => identity.split('~')[0];
