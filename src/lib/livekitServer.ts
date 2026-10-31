import { adminDb } from '@/lib/firebase-admin';
import { getServerEnv } from '@/security/env';

const env = getServerEnv();

export const LIVEKIT_API_KEY = env.LIVEKIT_API_KEY;
export const LIVEKIT_API_SECRET = env.LIVEKIT_API_SECRET;
export const LIVEKIT_HOST = env.LIVEKIT_HOST;

const MASTER_ADMIN_EMAILS = env.MASTER_ADMIN_EMAILS;
const FIREBASE_WEB_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.FIREBASE_WEB_API_KEY ||
  'AIzaSyCB84MWm3jF1PmRQyJxugarBfQT1Th4BwA';

export interface VerifiedCaller {
  uid: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  isAdmin: boolean;
}

/** Validates the Firebase ID token sent as `Authorization: Bearer <token>`. */
export async function verifyCaller(req: Request): Promise<VerifiedCaller | null> {
  const header = req.headers.get('authorization') || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!idToken) return null;

  let uid = '';
  let email = '';
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

  let role: VerifiedCaller['role'] = MASTER_ADMIN_EMAILS.includes(email) ? 'admin' : 'student';
  if (role === 'student') {
    try {
      const snap: any = await adminDb.collection('users').doc(uid).get();
      const data = snap?.data?.();
      if (snap?.exists && (data?.role === 'admin' || data?.role === 'teacher')) {
        role = data.role;
      }
    } catch {
      // Fallback to student if Firestore role lookup fails
    }
  }

  return { uid, email, role, isAdmin: role === 'admin' || role === 'teacher' };
}

/** Participant identity format: `<firebaseUid>~<sessionId>` so one account can join from many devices/tabs. */
export const uidFromIdentity = (identity: string) => identity.split('~')[0];
