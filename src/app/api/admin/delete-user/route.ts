import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
      if (adminAuth && typeof adminAuth.deleteUser === 'function') {
        await adminAuth.deleteUser(userId);
      }
    } catch (authError: any) {
      console.warn("Failed to delete from Auth (might not exist or no admin credentials):", authError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in delete-user route:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
