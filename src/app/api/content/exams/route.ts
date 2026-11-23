// ============================================================================
// SERVER-GATED EXAMS API (/api/content/exams & ?examId=<id>&mode=take|results)
// Defends against:
//   1. Unpaid students viewing exam papers / question PDFs
//   2. Students extracting MCQ correct answers (`q.correct`) via DevTools Console
//   3. Students accessing exam questions before `startTime`
// ============================================================================

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withZeroTrustGate } from '@/security/zero-trust-gate';
import { sanitizeText } from '@/security/sanitize';
import {
  getUserEntitlementContext,
  hasExamEntitlement,
  sanitizeExamDocument,
} from '@/security/entitlement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withZeroTrustGate(
  {
    scope: 'content_exams',
    limit: 90,
    windowMs: 60 * 1000,
    requireAuth: 'authenticated',
  },
  async (req, ctx) => {
    try {
      const ent = await getUserEntitlementContext(ctx.caller);
      if (!ent || ent.isBanned) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const url = new URL(req.url);
      const examId = sanitizeText(url.searchParams.get('examId') || '', 128).trim();
      const mode = sanitizeText(url.searchParams.get('mode') || 'take', 16);
      const now = Date.now();

      if (examId) {
        const [examDoc, myResultSnap] = await Promise.all([
          adminDb.collection('exams').doc(examId).get(),
          adminDb
            .collection('examResults')
            .where('userId', '==', ent.uid)
            .where('examId', '==', examId)
            .limit(1)
            .get(),
        ]);

        if (!examDoc.exists) {
          return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        const rawExam = { id: examDoc.id, ...(examDoc.data() || {}) } as Record<string, any>;
        const entitled = hasExamEntitlement(ent, rawExam, now);
        if (!entitled) {
          return NextResponse.json(
            { error: 'Payment required: You do not have active access to this exam.', locked: true },
            { status: 403 }
          );
        }

        const myResult = !myResultSnap.empty
          ? { id: myResultSnap.docs[0].id, ...(myResultSnap.docs[0].data() || {}) }
          : null;

        // Enforce exam timing window for non-staff students taking the exam
        if (!ent.isStaff && mode === 'take' && !myResult) {
          if (rawExam.startTime && now < Number(rawExam.startTime)) {
            return NextResponse.json(
              { error: 'This exam has not started yet.', notStarted: true },
              { status: 403 }
            );
          }
          if (rawExam.endTime && now > Number(rawExam.endTime)) {
            return NextResponse.json(
              { error: 'This exam has ended and is closed for new submissions.', ended: true },
              { status: 403 }
            );
          }
        }

        // Only reveal answer keys if staff OR student already submitted AND (gradesPublished or exam ended)
        const examEnded = rawExam.endTime ? now >= Number(rawExam.endTime) : true;
        const revealAnswers =
          ent.isStaff ||
          (mode === 'results' && Boolean(myResult) && (rawExam.gradesPublished === true || examEnded));

        const safeExam = sanitizeExamDocument(rawExam, {
          includeQuestions: true,
          revealAnswers,
          hasAccess: true,
        });

        let allResults: any[] = [];
        if (mode === 'results') {
          if (ent.isStaff) {
            const allSnap = await adminDb
              .collection('examResults')
              .where('examId', '==', examId)
              .get();
            allResults = allSnap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
          } else if (myResult) {
            allResults = [myResult];
          }
        }

        return NextResponse.json(
          {
            exam: safeExam,
            myResult,
            results: allResults,
          },
          { headers: { 'Cache-Control': 'private, no-store, no-cache' } }
        );
      }

      // Catalog listing for /exams page (NEVER includes raw questions or answer keys!)
      const [examsSnap, foldersSnap, resultsSnap] = await Promise.all([
        adminDb.collection('exams').get(),
        adminDb.collection('folders').get(),
        adminDb.collection('examResults').where('userId', '==', ent.uid).get(),
      ]);

      const exams = examsSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() || {}) }))
        .filter((e: any) => !e.hidden && !e.deleted)
        .map((e: any) =>
          sanitizeExamDocument(e, {
            includeQuestions: false,
            revealAnswers: false,
            hasAccess: hasExamEntitlement(ent, e, now),
          })
        );

      const folders = foldersSnap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      const results: Record<string, any> = {};
      resultsSnap.docs.forEach((d) => {
        const data = d.data() || {};
        if (data.examId) results[data.examId] = { id: d.id, ...data };
      });

      return NextResponse.json(
        { exams, folders, results },
        { headers: { 'Cache-Control': 'private, no-store, no-cache' } }
      );
    } catch (err: any) {
      console.error('[API /content/exams] Error:', err);
      return NextResponse.json({ error: 'Failed to load exams' }, { status: 500 });
    }
  }
);
