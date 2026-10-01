import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const snapshot = await adminDb.collection('live_classes').get();
  let draftCount = 0;
  let allCount = 0;
  let lastDraft = null;
  
  snapshot.docs.forEach(doc => {
    allCount++;
    if (doc.data().status === 'draft') {
      draftCount++;
      lastDraft = { id: doc.id, ...doc.data() };
    }
  });

  return NextResponse.json({ allCount, draftCount, lastDraft });
}
