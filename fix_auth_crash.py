import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\lib\AuthContext.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update recordStudyMinute to save to localStorage
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

    // Buffer in memory for both Web and App
    pendingStudyMinutesRef.current += 1;
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
    // Persist to local storage for sudden death/crash recovery!
    if (typeof window !== 'undefined') {
      localStorage.setItem(pendingStudyMins_, pendingStudyMinutesRef.current.toString());
    }
  }, [user]);'''

content = content.replace(old_record, new_record)


# 2. Update syncStudyTimeNow to clear localStorage
old_sync_start = '''    const minutesToSync = pendingStudyMinutesRef.current;
    pendingStudyMinutesRef.current = 0;'''

new_sync_start = '''    const minutesToSync = pendingStudyMinutesRef.current;
    pendingStudyMinutesRef.current = 0;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(pendingStudyMins_);
    }'''

content = content.replace(old_sync_start, new_sync_start)


# 3. Update useEffect to restore minimize logic AND check for crashed data on boot
old_effect = '''  useEffect(() => {
    // Sync every 3 hours (10,800,000 ms) while active as a fallback
    const interval = setInterval(() => {
      syncStudyTimeNow();
    }, 3 * 60 * 60 * 1000);

    const handleBeforeUnload = () => {
      syncStudyTimeNow();
    };

    // Only sync on actual page unload/close, NEVER on tab switch or minimize
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleBeforeUnload);
      syncStudyTimeNow();
    };
  }, [syncStudyTimeNow]);'''

new_effect = '''  useEffect(() => {
    // Crash Recovery: Check if the app died suddenly while holding unsaved minutes
    if (user?.uid && typeof window !== 'undefined') {
      const recoveredMins = parseInt(localStorage.getItem(pendingStudyMins_) || '0');
      if (recoveredMins > 0) {
        pendingStudyMinutesRef.current = recoveredMins;
        syncStudyTimeNow(); // Upload the recovered minutes immediately on boot!
      }
    }

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
    window.addEventListener('unload', handleBeforeUnload);

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
      window.removeEventListener('unload', handleBeforeUnload);
      syncStudyTimeNow();
    };
  }, [syncStudyTimeNow, user?.uid]);'''

content = content.replace(old_effect, new_effect)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("AuthContext crash recovery and minimize logic restored")
