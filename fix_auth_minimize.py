import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\lib\AuthContext.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_effect = '''  useEffect(() => {
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

new_effect = '''  useEffect(() => {
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

if old_effect in content:
    content = content.replace(old_effect, new_effect)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("AuthContext modified to remove minimize/tab-switch sync")
else:
    print("Could not find the exact block.")

