/**
 * Physics Beast LMS - Unified XP & Leveling Engine
 * 
 * XP is comprehensively awarded based on:
 * 1. Study Time: 10 XP per minute of watching videos
 * 2. Exam Marks: 50 XP per correct question + percentage bonus
 * 3. Exam Time: Speed efficiency bonus for completing before time runs out
 * 4. Exam Participation: 100 XP completion bonus
 * 5. Exam Time as Study Time: Time taken during exams also counts toward study time
 */

export const XP_PER_STUDY_MINUTE = 10;
export const XP_PER_LEVEL = 500;

export interface ExamXpParams {
  correctAnswers: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  durationSeconds: number;
}

export interface ExamXpResult {
  marksXp: number;
  scoreBonusXp: number;
  timeBonusXp: number;
  completionXp: number;
  totalXp: number;
  percentage: number;
  grade: string;
  studyMinutes: number;
}

/**
 * Calculates XP earned from an exam based on marks, time efficiency, and completion.
 */
export function calculateExamXp({
  correctAnswers,
  totalQuestions,
  timeTakenSeconds,
  durationSeconds,
}: ExamXpParams): ExamXpResult {
  const safeTotal = Math.max(1, totalQuestions);
  const percentage = Math.round((correctAnswers / safeTotal) * 100);

  // 1. Marks XP: 50 XP per correct question
  const marksXp = correctAnswers * 50;

  // 2. Score Percentage Bonus (up to 150 XP for perfect/high scores)
  const scoreBonusXp = Math.round((percentage / 100) * 150);

  // 3. Time Efficiency Bonus: Reward students who answer quickly and accurately
  // Earn 10 XP per full minute saved, capped at 100 XP bonus
  const timeSavedSeconds = Math.max(0, durationSeconds - timeTakenSeconds);
  const minutesSaved = Math.floor(timeSavedSeconds / 60);
  // Only grant time bonus if they passed (score >= 40%)
  const timeBonusXp = percentage >= 40 ? Math.min(100, minutesSaved * 10) : 0;

  // 4. Base completion bonus
  const completionXp = 100;

  // Total XP
  const totalXp = marksXp + scoreBonusXp + timeBonusXp + completionXp;

  // Grade classification
  let grade = "F";
  if (percentage >= 75) grade = "A";
  else if (percentage >= 65) grade = "B";
  else if (percentage >= 55) grade = "C";
  else if (percentage >= 35) grade = "S";

  // Exam time also contributes to study time
  const studyMinutes = Math.max(1, Math.round(timeTakenSeconds / 60));

  return {
    marksXp,
    scoreBonusXp,
    timeBonusXp,
    completionXp,
    totalXp,
    percentage,
    grade,
    studyMinutes
  };
}

/**
 * Calculates current XP level from total XP.
 * Level 1: 0 - 499
 * Level 2: 500 - 999
 * Level 3: 1000 - 1499, etc.
 */
export function calculateXpLevel(totalXp: number = 0): number {
  return Math.max(1, Math.floor((totalXp || 0) / XP_PER_LEVEL) + 1);
}

/**
 * Formats seconds into human-friendly "Xm Ys" format.
 */
export function formatSeconds(seconds: number = 0): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
