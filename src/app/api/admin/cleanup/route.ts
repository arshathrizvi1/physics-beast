import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!adminAuth || typeof adminAuth.listUsers !== 'function') {
       return NextResponse.json({ error: 'Firebase Admin not configured properly. Ensure ENV variables are set.' }, { status: 500 });
    }

    // 1. Get all users from Firebase Authentication (up to 1000)
    const listUsersResult = await adminAuth.listUsers(1000);
    const authUsers = listUsersResult.users;

    // 2. Get all valid users currently existing in the Firestore Database
    const snapshot = await adminDb.collection('users').get();
    const validUids = new Set();
    snapshot.docs.forEach((doc: any) => {
      validUids.add(doc.id);
    });

    const deletedEmails: string[] = [];
    
    // 3. Find users stuck in Auth but missing from Database (Orphans) and delete them
    for (const authUser of authUsers) {
      if (!validUids.has(authUser.uid)) {
        try {
          await adminAuth.deleteUser(authUser.uid);
          if (authUser.email) deletedEmails.push(authUser.email);
        } catch (err: any) {
          console.error(`Failed to delete ${authUser.email}:`, err.message);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully cleaned up ${deletedEmails.length} orphaned accounts that were stuck in Auth.`,
      deletedAccounts: deletedEmails 
    });

  } catch (error: any) {
    console.error("Cleanup Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
