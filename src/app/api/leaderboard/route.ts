import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withZeroTrustGate } from '@/security/zero-trust-gate';

export const dynamic = 'force-dynamic';

export const GET = withZeroTrustGate(
  {
    scope: 'leaderboard_get',
    limit: 60,
    windowMs: 60 * 1000,
    requireAuth: 'authenticated',
  },
  async () => {
    try {
      const [usersSnap, resultsSnap, examsSnap, subjectsSnap, batchesSnap] = await Promise.all([
        adminDb.collection('users').where('role', '==', 'student').get(),
        adminDb.collection('examResults').get(),
        adminDb.collection('exams').get(),
        adminDb.collection('subjects').get(),
        adminDb.collection('batches').get(),
      ]);

      // Sanitize user documents: strip ALL PII (phone, parentPhone, email, address, etc.)
      const users = usersSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name || 'Student',
          graduationYear: d.graduationYear || null,
          batchId: d.batchId || null,
          totalXp: Number(d.totalXp) || 0,
          xpLevel: Number(d.xpLevel) || 1,
          totalStudyTimeMins: Number(d.totalStudyTimeMins) || 0,
          photoUrl: d.photoUrl || null,
          averageGrade: Number(d.averageGrade) || 0,
        };
      });

      // Sanitize exam results
      const examResults = resultsSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          userId: d.userId || '',
          examId: d.examId || '',
          score: Number(d.score) || 0,
          rawScore: Number(d.rawScore) || 0,
          timeSeconds: Number(d.timeSeconds || d.timeTakenSeconds) || 0,
          timeTakenSeconds: Number(d.timeTakenSeconds || d.timeSeconds) || 0,
        };
      });

      // Sanitize exams
      const allExams = examsSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title || 'Exam',
          course: d.course || null,
          category: d.category || null,
        };
      });

      // Subjects & Batches
      const subjects = subjectsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const batches = batchesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      return NextResponse.json(
        {
          users,
          examResults,
          allExams,
          subjects,
          batches,
        },
        {
          headers: {
            'Cache-Control': 'private, s-maxage=120, stale-while-revalidate=300',
          },
        }
      );
    } catch (err: any) {
      console.error('[Leaderboard API Error]:', err);
      return NextResponse.json({ error: 'Failed to retrieve leaderboard dataset' }, { status: 500 });
    }
  }
);
