// ============================================================================
// SERVER-AUTHORITATIVE EXAM GRADING & SUBMISSION API (/api/content/exam-submit)
// Prevents:
//   1. Client-side score/XP forgery (MCQ answers graded 100% on the server)
//   2. Answer-key theft (students never receive `q.correct` while taking exam)
//   3. Multiple-attempt replay & out-of-window submissions
// ============================================================================

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { sanitizeText } from '@/security/sanitize';
import { getUserEntitlementContext, hasExamEntitlement } from '@/security/entitlement';
import { calculateExamXp, calculateXpLevel } from '@/lib/xp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withZeroTrustGate(
  {
    scope: 'content_exam_submit',
    limit: 15,
    windowMs: 60 * 1000,
    requireAuth: 'authenticated',
  },
  async (req, ctx) => {
    try {
      const ent = await getUserEntitlementContext(ctx.caller);
      if (!ent || ent.isBanned) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const parsed = await parseAndVerifyJsonBody<{
        examId?: string;
        answers?: Record<string | number, any>;
        answerPdfUrl?: string;
        timeTakenSeconds?: number;
      }>(req, ctx);
      if (!parsed.ok) return parsed.response;

      const examId = sanitizeText(parsed.body.examId || '', 128).trim();
      if (!examId) {
        return NextResponse.json({ error: 'Missing examId' }, { status: 400 });
      }

      const examDoc = await adminDb.collection('exams').doc(examId).get();
      if (!examDoc.exists) {
        return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
      }

      const exam = { id: examDoc.id, ...(examDoc.data() || {}) } as Record<string, any>;
      const now = Date.now();

      if (!hasExamEntitlement(ent, exam, now)) {
        return NextResponse.json(
          { error: 'Payment required: You do not have access to submit this exam.' },
          { status: 403 }
        );
      }

      // Enforce timing window (allow 2-minute grace window after endTime for auto-submit uploads)
      if (!ent.isStaff) {
        if (exam.startTime && now < Number(exam.startTime)) {
          return NextResponse.json({ error: 'This exam has not started yet.' }, { status: 403 });
        }
        if (exam.endTime && now > Number(exam.endTime) + 120 * 1000) {
          return NextResponse.json({ error: 'Submission window has closed.' }, { status: 403 });
        }
      }

      // Single-attempt enforcement (keyed deterministically by `${examId}_${ent.uid}`)
      const existingQuery = await adminDb
        .collection('examResults')
        .where('userId', '==', ent.uid)
        .where('examId', '==', examId)
        .limit(1)
        .get();
      if (!existingQuery.empty) {
        return NextResponse.json(
          { error: 'You have already submitted this exam.', alreadySubmitted: true },
          { status: 409 }
        );
      }

      const rawQuestions = Array.isArray(exam.questions) ? exam.questions : [];
      const answers =
        parsed.body.answers && typeof parsed.body.answers === 'object'
          ? parsed.body.answers
          : {};
      const rawAnswerPdfUrl = sanitizeText(parsed.body.answerPdfUrl || '', 1024).trim();
      const answerPdfUrl =
        rawAnswerPdfUrl &&
        (rawAnswerPdfUrl.startsWith('https://') || rawAnswerPdfUrl.startsWith('/api/r2-media/'))
          ? rawAnswerPdfUrl
          : '';
      const duration = Math.max(60, Number(exam.durationSeconds || 900));
      const timeTaken = Math.max(
        1,
        Math.min(duration + 120, Math.round(Number(parsed.body.timeTakenSeconds || duration)))
      );

      // Authoritative Server-Side MCQ Grading
      let totalCorrect = 0;
      const isEssay = exam.examType === 'essay';
      if (!isEssay) {
        rawQuestions.forEach((q: any, idx: number) => {
          const submitted = answers[idx] ?? answers[String(idx)];
          if (submitted === undefined || submitted === null) return;
          const isCorrect = Array.isArray(q.correct)
            ? q.correct.includes(submitted)
            : submitted === q.correct;
          if (isCorrect) totalCorrect++;
        });
      }

      const xpDetails = calculateExamXp({
        correctAnswers: totalCorrect,
        totalQuestions: isEssay ? 100 : rawQuestions.length || 1,
        timeTakenSeconds: timeTaken,
        durationSeconds: duration,
      });

      const xpToGain = isEssay ? 10 : xpDetails.totalXp;
      const resultDoc = {
        examId: String(examId),
        examTitle: String(exam.title || 'Exam'),
        userId: ent.uid,
        studentId: ent.uid,
        studentName: ent.name || ent.email.split('@')[0] || 'Student',
        score: isEssay ? 0 : xpDetails.percentage,
        rawScore: totalCorrect,
        totalQuestions: isEssay ? 0 : rawQuestions.length,
        grade: isEssay ? 'Pending' : xpDetails.grade,
        status: isEssay ? 'pending_grading' : 'done',
        timeSeconds: timeTaken,
        timeTakenSeconds: timeTaken,
        durationSeconds: duration,
        xpEarned: xpToGain,
        timestamp: now,
        answers: isEssay ? {} : answers,
        answerPdfUrl: isEssay ? answerPdfUrl : '',
        examType: exam.examType || 'mcq',
      };

      const deterministicResultId = `${examId}_${ent.uid}`;
      try {
        await adminDb.collection('examResults').doc(deterministicResultId).create(resultDoc);
      } catch (createErr: any) {
        if (createErr?.code === 6 || /ALREADY_EXISTS/i.test(String(createErr?.message || ''))) {
          return NextResponse.json(
            { error: 'You have already submitted this exam.', alreadySubmitted: true },
            { status: 409 }
          );
        }
        throw createErr;
      }

      // Update student XP, level, exam count, and average grade server-side
      if (ent.role === 'student') {
        const pastSnap = await adminDb
          .collection('examResults')
          .where('userId', '==', ent.uid)
          .get();
        const allScores: number[] = [];
        pastSnap.docs.forEach((d) => {
          const data = d.data() || {};
          if (data.examType !== 'essay' && typeof data.score === 'number') {
            allScores.push(data.score);
          }
        });
        const avgGrade =
          allScores.length > 0
            ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
            : 0;
        const newTotalXp = (ent.totalXp || 0) + xpToGain;
        const newLevel = calculateXpLevel(newTotalXp);

        await adminDb.collection('users').doc(ent.uid).update({
          totalXp: newTotalXp,
          xpLevel: newLevel,
          level: newLevel,
          examsCompleted: pastSnap.size,
          examsDone: pastSnap.size,
          averageGrade: avgGrade,
        });
      }

      return NextResponse.json({
        success: true,
        resultId: deterministicResultId,
        score: totalCorrect,
        percentage: isEssay ? 0 : xpDetails.percentage,
        grade: resultDoc.grade,
        xpResult: xpDetails,
        timeTakenSeconds: timeTaken,
      });
    } catch (err: any) {
      console.error('[API /content/exam-submit] Error:', err);
      return NextResponse.json({ error: 'Failed to submit exam' }, { status: 500 });
    }
  }
);
