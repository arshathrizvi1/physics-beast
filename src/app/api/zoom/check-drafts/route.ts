import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withZeroTrustGate } from '@/security/zero-trust-gate';

export const dynamic = 'force-dynamic';

export const GET = withZeroTrustGate(
  {
    scope: 'zoom_check_drafts',
    limit: 30,
    windowMs: 60 * 1000,
    requireAuth: 'teacher_or_admin',
  },
  async () => {
    const snapshot = await adminDb.collection('live_classes').get();
    let draftCount = 0;
    let allCount = 0;
    let lastDraft = null;

    snapshot.docs.forEach((doc) => {
      allCount++;
      if (doc.data().status === 'draft') {
        draftCount++;
        lastDraft = { id: doc.id, ...doc.data() };
      }
    });

    return NextResponse.json({ allCount, draftCount, lastDraft });
  }
);
