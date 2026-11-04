// ============================================================================
// BRILLIANT ACADEMY - OFFLINE-FIRST 0MS LOCAL READ & FLUSH-ON-CLOSE ENGINE
// Architecture:
//   1. 0ms Synchronous Local Reads from LocalStorage / IndexedDB Cache
//   2. Write-Behind Mutation Queue (Updates locally instantly, syncs async)
//   3. Cryptographically Authenticated Exit Flush: `visibilitychange` + `keepalive fetch`
//      flushes queued mutations to Cloudflare D1 SQL with verified Firebase Auth ID tokens
// ============================================================================

import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export interface PendingMutation {
  id: string;
  type: 'video_progress' | 'audit_log';
  userId: string;
  courseId?: string;
  lessonId?: string;
  watchedSeconds?: number;
  totalSeconds?: number;
  isCompleted?: boolean;
  eventType?: string;
  details?: Record<string, any>;
  timestamp: number;
}

const MUTATION_QUEUE_KEY = 'ba_pending_mutations_v1';
const MEMORY_CACHE = new Map<string, any>();

class OfflineSyncManager {
  private queue: PendingMutation[] = [];
  private syncTimer: any = null;
  private isSyncing = false;
  private cachedIdToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadQueueFromDisk();
      this.initExitFlushHandler();
      this.startPeriodicSync();

      try {
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            try {
              this.cachedIdToken = await user.getIdToken();
            } catch {}
          } else {
            this.cachedIdToken = null;
          }
        });
      } catch {}
    }
  }

  private async getIdToken(): Promise<string | null> {
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        this.cachedIdToken = token;
        return token;
      }
    } catch {}
    return this.cachedIdToken;
  }

  // --- 1. 0ms Synchronous Local Reads ---
  public getLocal<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;

    if (MEMORY_CACHE.has(key)) {
      return MEMORY_CACHE.get(key) as T;
    }

    try {
      const raw = localStorage.getItem(`ba_cache_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        MEMORY_CACHE.set(key, parsed);
        return parsed as T;
      }
    } catch (e) {
      // Ignore storage errors
    }

    return fallback;
  }

  // --- 2. Instant Local Writes ---
  public setLocal<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;

    MEMORY_CACHE.set(key, value);
    try {
      localStorage.setItem(`ba_cache_${key}`, JSON.stringify(value));
    } catch (e) {
      // Storage quota fallback
    }
  }

  // --- 3. Queue Video Progress ---
  public recordProgress(
    userId: string,
    courseId: string,
    lessonId: string,
    watchedSeconds: number,
    totalSeconds: number,
    isCompleted = false
  ): void {
    const progressKey = `progress_${userId}_${lessonId}`;
    const progressData = {
      watchedSeconds,
      totalSeconds,
      isCompleted: isCompleted || (totalSeconds > 0 && watchedSeconds >= totalSeconds * 0.9),
      updatedAt: Date.now(),
    };

    // Instant 0ms local read update
    this.setLocal(progressKey, progressData);

    // Queue mutation for Cloudflare D1
    const mutation: PendingMutation = {
      id: `${userId}_${lessonId}`,
      type: 'video_progress',
      userId,
      courseId,
      lessonId,
      watchedSeconds,
      totalSeconds,
      isCompleted: progressData.isCompleted,
      timestamp: Date.now(),
    };

    this.enqueue(mutation);
  }

  // --- 4. Queue Audit Log ---
  public logAction(userId: string, eventType: string, details: Record<string, any> = {}): void {
    const mutation: PendingMutation = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'audit_log',
      userId,
      eventType,
      details,
      timestamp: Date.now(),
    };
    this.enqueue(mutation);
  }

  private enqueue(mutation: PendingMutation): void {
    const existingIndex = this.queue.findIndex(
      (m) => m.type === mutation.type && m.id === mutation.id
    );

    if (existingIndex !== -1) {
      this.queue[existingIndex] = mutation;
    } else {
      this.queue.push(mutation);
    }

    this.saveQueueToDisk();
  }

  private loadQueueFromDisk(): void {
    try {
      const raw = localStorage.getItem(MUTATION_QUEUE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch (e) {
      this.queue = [];
    }
  }

  private saveQueueToDisk(): void {
    try {
      localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      // Fallback
    }
  }

  // --- 5. Bulletproof Flush on Tab Close / Minimize ---
  private initExitFlushHandler(): void {
    const flush = () => {
      if (this.queue.length === 0) return;

      const token = this.cachedIdToken;
      if (!token) return; // Never send unauthenticated requests

      // Enforce batch limit of max 50 items
      const batch = this.queue.slice(0, 50);
      const payload = JSON.stringify({ authToken: token, mutations: batch });

      let sent = false;
      // Modern browsers: fetch with keepalive: true supports Authorization header on page unload
      if (typeof fetch !== 'undefined') {
        try {
          fetch('/api/sync-flush', {
            method: 'POST',
            keepalive: true,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: payload,
          }).catch(() => {});
          sent = true;
        } catch {}
      }

      // Fallback to sendBeacon with token in payload if fetch keepalive is unavailable
      if (!sent && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        try {
          const blob = new Blob([payload], { type: 'application/json' });
          sent = navigator.sendBeacon('/api/sync-flush', blob);
        } catch {}
      }

      if (sent) {
        this.queue = this.queue.filter((m) => !batch.some((b) => b.id === m.id));
        this.saveQueueToDisk();
      }
    };

    // Trigger flush on tab minimize / switch
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    });

    // Trigger flush on page unload / navigation
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
  }

  // --- 6. Periodic Background Sync ---
  private startPeriodicSync(): void {
    this.syncTimer = setInterval(() => {
      this.syncNow();
    }, 15000);
  }

  public async syncNow(): Promise<void> {
    if (this.isSyncing || this.queue.length === 0 || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

    const token = await this.getIdToken();
    if (!token) return; // Cannot flush without authenticated student identity

    this.isSyncing = true;
    // Enforce maximum batch size of 50 to prevent D1 batch overflow
    const batch = this.queue.slice(0, 50);

    try {
      const res = await fetch('/api/sync-flush', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ authToken: token, mutations: batch }),
      });

      if (res.ok) {
        // Remove synced mutations
        this.queue = this.queue.filter((m) => !batch.some((b) => b.id === m.id));
        this.saveQueueToDisk();
      }
    } catch (e) {
      // Keep in queue for next sync or exit beacon
    } finally {
      this.isSyncing = false;
    }
  }
}

export const offlineSync = new OfflineSyncManager();
