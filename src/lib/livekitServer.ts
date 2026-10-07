import { adminDb } from '@/lib/firebase-admin';

export const LIVEKIT_API_KEY = 'APIbrilliant';
export const LIVEKIT_API_SECRET = 'esDs-h5uEpAMt5oGWOJXx20TO5kcP7-mQPYVXwbBwro';
export const LIVEKIT_HOST = (process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://live.brillliantacademy.site')
  .replace(/^wss:/, 'https:')
  .replace(/^ws:/, 'http:');

const MASTER_ADMIN_EMAILS = ['arshathrizvi1010@gmail.com', 'admin@brilliantacademy.com'];
const FIREBASE_WEB_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCB84MWm3jF1PmRQyJxugarBfQT1Th4BwA';

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
    } catch (e) {
      console.warn('Role lookup failed, treating caller as student');
    }
  }

  return { uid, email, role, isAdmin: role === 'admin' || role === 'teacher' };
}

/** Participant identity format: `<firebaseUid>~<sessionId>` so one account can join from many devices/tabs. */
export const uidFromIdentity = (identity: string) => identity.split('~')[0];
