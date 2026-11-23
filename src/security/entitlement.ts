// ============================================================================
// BRILLIANT ACADEMY — ZERO-TRUST SERVER-SIDE CONTENT ENTITLEMENT AUTHORITY
// Enforces authoritative server-side payment & enrollment verification for:
//   - Course Videos (YouTube, Cloudflare R2 HLS, Bunny Stream, Direct)
//   - PDF Study Materials & Exam Question Papers
//   - Live Interactive Classes (LiveKit, Zoom, RTMP, YouTube Live)
//   - Online Exams (Answer Key Stripping + Timing Enforcement)
// Zero client-side trust: unpaid users NEVER receive video/PDF/live URLs.
// ============================================================================

import { adminDb } from '@/lib/firebase-admin';
import type { VerifiedCaller } from '@/lib/livekitServer';

export interface UserEntitlementContext {
  uid: string;
  email: string;
  name: string;
  studentId: string;
  phone: string;
  role: 'admin' | 'teacher' | 'student';
  isStaff: boolean;
  isBanned: boolean;
  folderAccess: Record<string, number>;
  accessibleCourses: string[];
  graduationYear: string;
  totalXp: number;
  examsCompleted: number;
}

/**
 * Loads the authoritative user entitlement record directly from Firestore via Admin SDK.
 * Never trusts client-supplied folderAccess, accessibleCourses, or role claims.
 */
export async function getUserEntitlementContext(
  caller: VerifiedCaller | null | undefined
): Promise<UserEntitlementContext | null> {
  if (!caller || !caller.uid) return null;

  // Hardware-bound admin session cookie caller (`session:email`)
  if (caller.uid.startsWith('session:') && caller.isAdmin) {
    return {
      uid: caller.uid,
      email: caller.email,
      name: 'Administrator',
      studentId: '',
      phone: '',
      role: caller.role,
      isStaff: true,
      isBanned: false,
      folderAccess: {},
      accessibleCourses: [],
      graduationYear: '',
      totalXp: 0,
      examsCompleted: 0,
    };
  }

  try {
    const userSnap = await adminDb.collection('users').doc(caller.uid).get();
    const data = userSnap.exists ? (userSnap.data() || {}) : {};

    const isBanned = data.isBanned === true;
    const isStaff =
      caller.isAdmin ||
      data.isAdmin === true ||
      data.role === 'admin' ||
      ((data.role === 'teacher' || data.role === 'instructor') && data.isApproved !== false);

    const role: 'admin' | 'teacher' | 'student' =
      caller.role === 'admin' || data.isAdmin === true || data.role === 'admin'
        ? 'admin'
        : isStaff
        ? 'teacher'
        : 'student';

    const rawFolderAccess =
      data.folderAccess && typeof data.folderAccess === 'object' ? data.folderAccess : {};
    const folderAccess: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawFolderAccess)) {
      const num = Number(v);
      if (Number.isFinite(num) && num > 0) {
        folderAccess[k] = num;
      }
    }

    const accessibleCourses: string[] = Array.isArray(data.accessibleCourses)
      ? data.accessibleCourses.map((c: unknown) => String(c || '')).filter(Boolean)
      : [];

    return {
      uid: caller.uid,
      email: String(data.email || caller.email || '').toLowerCase(),
      name: String(data.name || ''),
      studentId: String(data.studentId || ''),
      phone: String(data.phone || ''),
      role,
      isStaff,
      isBanned,
      folderAccess,
      accessibleCourses,
      graduationYear: String(data.graduationYear || ''),
      totalXp: Number(data.totalXp || 0),
      examsCompleted: Number(data.examsCompleted || 0),
    };
  } catch (err) {
    console.error('[Entitlement] Failed to load user entitlement context:', err);
    return null;
  }
}

/**
 * Checks whether the caller has active entitlement to a specific course/folder item.
 */
export function hasCourseOrFolderEntitlement(
  ent: UserEntitlementContext | null,
  params: {
    courseId?: string | null;
    folderId?: string | null;
    isFree?: boolean | null;
    nowMs?: number;
  }
): boolean {
  if (params.isFree === true) return true;
  if (!ent || ent.isBanned) return false;
  if (ent.isStaff) return true;

  const now = params.nowMs ?? Date.now();
  const courseId = String(params.courseId || '').trim();
  const folderId = String(params.folderId || '').trim();

  if (courseId && ent.accessibleCourses.includes(courseId)) {
    return true;
  }

  if (folderId) {
    const expiry = ent.folderAccess[folderId];
    if (typeof expiry === 'number' && expiry > now) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether the caller has active entitlement to a live class document.
 */
export function hasLiveClassEntitlement(
  ent: UserEntitlementContext | null,
  cls: Record<string, any>,
  folderCourseMap?: Map<string, string>,
  nowMs?: number
): boolean {
  if (!cls) return false;
  if (!ent || ent.isBanned) return false;
  if (ent.isStaff) return true;
  if (cls.status === 'draft') return false;
  if (cls.isFree === true) return true;

  const now = nowMs ?? Date.now();

  // Batch restriction
  if (cls.batchId && cls.batchId !== 'all' && ent.graduationYear !== cls.batchId) {
    return false;
  }

  // Specific monthly folder audience gate
  const audienceFolderId = String(cls.audienceFolderId || '').trim();
  if (audienceFolderId && audienceFolderId !== 'all' && audienceFolderId !== 'none') {
    const expiry = ent.folderAccess[audienceFolderId];
    return typeof expiry === 'number' && expiry > now;
  }

  // Course-level gate
  const courseId = String(cls.courseId || '').trim();
  if (!courseId || courseId === 'all') {
    return true;
  }

  if (ent.accessibleCourses.includes(courseId)) {
    return true;
  }

  if (folderCourseMap) {
    for (const [fId, expiry] of Object.entries(ent.folderAccess)) {
      if (typeof expiry === 'number' && expiry > now && folderCourseMap.get(fId) === courseId) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether the caller has entitlement to access an exam.
 */
export function hasExamEntitlement(
  ent: UserEntitlementContext | null,
  exam: Record<string, any>,
  nowMs?: number
): boolean {
  if (!exam) return false;
  if (!ent || ent.isBanned) return false;
  if (ent.isStaff) return true;
  if (exam.hidden === true || exam.deleted === true) return false;
  if (exam.isFree === true) return true;

  const folderId = String(exam.folderId || '').trim();
  const courseId = String(exam.courseId || '').trim();

  // General / unassigned exam with no course/folder gate
  if ((!folderId || folderId === 'unassigned') && (!courseId || courseId === 'all')) {
    return true;
  }

  return hasCourseOrFolderEntitlement(ent, {
    courseId: courseId === 'all' ? '' : courseId,
    folderId: folderId === 'unassigned' ? '' : folderId,
    isFree: exam.isFree === true,
    nowMs,
  });
}

const SENSITIVE_VIDEO_FIELDS = [
  'url',
  'r2Url',
  'originalYoutubeUrl',
  'youtubeUrl',
  'youtubeId',
  'videoId',
  'hlsUrl',
  'pdfUrl',
  'streamUrl',
  'bunnyUrl',
  'downloadUrl',
  'link',
  'embedUrl',
  'playbackUrl',
  'rawUrl',
  's3Url',
  'streamKey',
  'rtmpUrl',
];

/**
 * Strips ALL playable URLs, YouTube IDs, R2 paths, Bunny IDs, and PDF links
 * from a locked video/resource record so unpaid users can NEVER extract them via DevTools.
 */
export function stripSensitiveVideoFields(video: Record<string, any>): Record<string, any> {
  const safe: Record<string, any> = {
    id: video.id,
    title: video.title || 'Locked Lesson',
    description: video.description || '',
    courseId: video.courseId || '',
    folderId: video.folderId || '',
    type: video.type || 'video',
    duration: video.duration || null,
    durationSeconds: video.durationSeconds || null,
    thumbnail: video.thumbnail || video.thumbnailUrl || null,
    order: video.order ?? null,
    createdAt: video.createdAt || 0,
    isFree: Boolean(video.isFree),
    isReady: video.isReady,
    processingStatus: video.processingStatus || null,
    isLocked: true,
    hasAccess: false,
  };
  for (const field of SENSITIVE_VIDEO_FIELDS) {
    safe[field] = null;
  }
  return safe;
}

/**
 * Returns a sanitized entitled video object for a verified paid student or staff member.
 * If a video has a ready R2/Bunny stream AND YouTube playback is disabled for all devices,
 * strips raw YouTube links for non-staff students as an extra anti-leak safeguard.
 */
export function sanitizeEntitledVideo(
  video: Record<string, any>,
  isStaff: boolean
): Record<string, any> {
  const copy: Record<string, any> = {
    ...video,
    isLocked: false,
    hasAccess: true,
  };

  if (!isStaff) {
    const isProcessing = Boolean(
      video.isReady === false ||
        video.processingStatus === 'processing' ||
        video.processingStatus === 'downloading' ||
        video.processingStatus === 'downloading_on_aws' ||
        video.transcodeStatus === 'processing'
    );
    const hasProtectedStream = Boolean(video.r2Url || video.platform === 'r2' || video.platform === 'bunny');
    const ytSettings = video.playerSettings?.youtube;
    const ytExplicitlyDisabled =
      ytSettings &&
      ytSettings.mobile === false &&
      ytSettings.tablet === false &&
      ytSettings.desktop === false;

    if (hasProtectedStream && !isProcessing && ytExplicitlyDisabled) {
      copy.originalYoutubeUrl = null;
      copy.youtubeUrl = null;
      copy.youtubeId = null;
    }
  }

  return copy;
}

const SENSITIVE_LIVE_FIELDS = [
  'link',
  'multiStreams',
  'zoomLink',
  'meetingNumber',
  'password',
  'passcode',
  'rtmpUrl',
  'streamKey',
  'youtubeUrl',
  'originalYoutubeUrl',
  'r2Url',
  'hlsUrl',
  'videoUrl',
];

/**
 * Strips all live stream join links, YouTube live URLs, Zoom passwords, and RTMP keys
 * from a live class record when the caller is not entitled.
 */
export function stripSensitiveLiveFields(cls: Record<string, any>): Record<string, any> {
  const safe: Record<string, any> = {
    id: cls.id,
    title: cls.title || 'Locked Live Class',
    description: cls.description || '',
    courseId: cls.courseId || '',
    audienceFolderId: cls.audienceFolderId || '',
    batchId: cls.batchId || '',
    status: cls.status || 'scheduled',
    scheduledFor: cls.scheduledFor || 0,
    teacherName: cls.teacherName || '',
    platform: cls.platform || 'webrtc',
    isFree: Boolean(cls.isFree),
    isLocked: true,
    hasAccess: false,
  };
  for (const field of SENSITIVE_LIVE_FIELDS) {
    safe[field] = null;
  }
  return safe;
}

/**
 * Sanitizes an exam document:
 *   - For catalog listing (`includeQuestions = false`): strips `questions` array and `questionPdfUrl`, keeping only `questionCount`.
 *   - For taking an exam (`includeQuestions = true, revealAnswers = false`): strips all `correct`, `correctAnswer`, `answerKey`, `explanation` fields!
 *   - For results review (`revealAnswers = true`): includes answers once grades are published or for staff.
 */
export function sanitizeExamDocument(
  exam: Record<string, any>,
  options: {
    includeQuestions: boolean;
    revealAnswers: boolean;
    hasAccess: boolean;
  }
): Record<string, any> {
  const rawQuestions = Array.isArray(exam.questions) ? exam.questions : [];
  const questionCount = rawQuestions.length || (typeof exam.questions === 'number' ? exam.questions : 0);

  const base: Record<string, any> = {
    ...exam,
    questionCount,
    hasAccess: options.hasAccess,
    isLocked: !options.hasAccess,
  };

  if (!options.hasAccess) {
    base.questions = [];
    base.questionPdfUrl = null;
    base.answerPdfUrl = null;
    base.markingSchemeUrl = null;
    return base;
  }

  if (!options.includeQuestions) {
    base.questions = questionCount;
    base.questionPdfUrl = null;
    base.markingSchemeUrl = null;
    return base;
  }

  if (!options.revealAnswers) {
    base.questions = rawQuestions.map((q: any) => {
      if (!q || typeof q !== 'object') return q;
      const {
        correct: _c,
        correctAnswer: _ca,
        correctOption: _co,
        answer: _a,
        answerKey: _ak,
        explanation: _ex,
        ...safeQuestion
      } = q;
      return safeQuestion;
    });
    base.markingSchemeUrl = null;
  } else {
    base.questions = rawQuestions;
  }

  return base;
}

/**
 * Extracts clean R2 object key from any stored R2 URL format.
 */
export function extractR2KeyFromUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (trimmed.includes('/api/r2-media/')) {
    const idx = trimmed.indexOf('/api/r2-media/');
    const after = trimmed.slice(idx + '/api/r2-media/'.length).split('?')[0];
    try {
      return decodeURIComponent(after).replace(/^\/+/, '');
    } catch {
      return after.replace(/^\/+/, '');
    }
  }
  if (trimmed.includes('r2.dev/') || trimmed.includes('r2.cloudflarestorage.com/')) {
    const parts = trimmed.split(/r2\.dev\/|r2\.cloudflarestorage\.com\/[^/]+\//);
    if (parts.length > 1) {
      return parts[1].split('?')[0].replace(/^\/+/, '');
    }
  }
  return null;
}
