import { adminDb } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ exists: false });
    }

    // 1. Check if the number is already used as a student phone
    const studentQuery = await adminDb.collection('users').where('phone', '==', phone).get();
    if (!studentQuery.empty) {
      return NextResponse.json({ exists: true, reason: 'This number is already registered as a student.' });
    }

    // 2. Check if the number is already used as a parent phone
    const parentQuery = await adminDb.collection('users').where('parentPhone', '==', phone).get();
    if (!parentQuery.empty) {
      return NextResponse.json({ exists: true, reason: 'This number is already registered as a parent.' });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("Phone check error:", error);
    return NextResponse.json({ exists: false, error: 'Failed to check phone' }, { status: 500 });
  }
}
