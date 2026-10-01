import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const snapshot = await adminDb.collection('live_classes').orderBy('createdAt', 'desc').limit(10).get();
  const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json(docs);
}
