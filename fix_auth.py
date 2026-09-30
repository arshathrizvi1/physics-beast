import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\lib\AuthContext.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# We will just rewrite the sync/record logic to be pure React and use Capacitor App state.
# Let's locate the entire isCapacitorRef.current logic and replace it.

old_record = '''  const recordStudyMinute = useCallback(() => {
    if (!user) return;
    
    // Always update local React state for instant UI feedback
    setUser(prev => {
      if (!prev) return prev;
      
      const newMins = (prev.totalStudyTimeMins || 0) + 1;
      const todayMins = (prev as any).todayStudyTimeMins || 0;
      const newTotalXp = (prev.totalXp || 0) + 1;
      
      return {
        ...prev,
        totalStudyTimeMins: newMins,
        todayStudyTimeMins: todayMins + 1,
        totalXp: newTotalXp,
        xpLevel: Math.max(1, Math.floor(newTotalXp / 500) + 1)
      };
    });

    if (isCapacitorRef.current) {
      // In Android app: save to SharedPreferences via native plugin (survives kills/reboots)
      try {
        (window as any).Capacitor.Plugins.StudyTime?.recordMinute();
      } catch {}
    } else {
      // On web: buffer in memory
      pendingStudyMinutesRef.current += 1;
    }
  }, [user]);'''

new_record = '''  const recordStudyMinute = useCallback(() => {
    if (!user) return;
    
    // Always update local React state for instant UI feedback
    setUser(prev => {
      if (!prev) return prev;
      
      const newMins = (prev.totalStudyTimeMins || 0) + 1;
      const todayMins = (prev as any).todayStudyTimeMins || 0;
      const newTotalXp = (prev.totalXp || 0) + 1;
      
      return {
        ...prev,
        totalStudyTimeMins: newMins,
        todayStudyTimeMins: todayMins + 1,
        totalXp: newTotalXp,
        xpLevel: Math.max(1, Math.floor(newTotalXp / 500) + 1)
      };
    });

    // Buffer in memory for both Web and App
    pendingStudyMinutesRef.current += 1;
  }, [user]);'''

content = content.replace(old_record, new_record)

old_sync = '''  const syncStudyTimeNow = useCallback(async () => {
    if (isCapacitorRef.current) {
      // In Android app: trigger native WorkManager sync
      try {
        (window as any).Capacitor.Plugins.StudyTime?.syncNow();
      } catch {}
      return;
    }

    // Web: sync from browser memory to Firestore
    if (!user || pendingStudyMinutesRef.current === 0) return;'''

new_sync = '''  const syncStudyTimeNow = useCallback(async () => {
    // Sync from memory to Firestore
    if (!user || pendingStudyMinutesRef.current === 0) return;'''

content = content.replace(old_sync, new_sync)

old_effect = '''  useEffect(() => {
    // In Capacitor: native WorkManager handles the 3-hour sync.
    // On web: use 5-minute interval sync.
    const interval = isCapacitorRef.current ? null : setInterval(() => {
      syncStudyTimeNow();
    }, 5 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        syncStudyTimeNow();
      }
    };

    const handleBeforeUnload = () => {
      syncStudyTimeNow();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      syncStudyTimeNow();
    };
  }, [syncStudyTimeNow]);'''

new_effect = '''  useEffect(() => {
    // Sync every 3 hours (10,800,000 ms) while active as a fallback
    const interval = setInterval(() => {
      syncStudyTimeNow();
    }, 3 * 60 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        syncStudyTimeNow();
      }
    };

    const handleBeforeUnload = () => {
      syncStudyTimeNow();
    };

    // Web Listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Capacitor App Background Listener
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          syncStudyTimeNow();
        }
      });
    }).catch(() => {});

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      syncStudyTimeNow();
    };
  }, [syncStudyTimeNow]);'''

content = content.replace(old_effect, new_effect)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("AuthContext modified successfully")
