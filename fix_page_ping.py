import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\course\[id]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_heartbeat_block = '''    // Ping every 60 seconds of wall-clock time, but only increment if video is currently playing
    const heartbeat = setInterval(() => {
      const currentVideo = activeVideoRef.current;
      if (!currentVideo) return;
      
      const presenceRef = doc(db, 'presence', ${currentVideo.id}_);
      setDoc(presenceRef, { videoId: currentVideo.id, userId: user.uid, lastActive: Date.now() }, { merge: true });
      
      if (playingRef.current || currentVideo.type === 'resource') {
        const userRef = doc(db, 'users', user.uid);
        const newXp = (user.totalXp || 0) + XP_PER_STUDY_MINUTE;
        const nowStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        const isSameDay = lastStudyDateRef.current === nowStr;
        if (!isSameDay) {
          lastStudyDateRef.current = nowStr;
        }
        
        updateDoc(userRef, {
          totalStudyTimeMins: increment(1),
          todayStudyTimeMins: isSameDay ? increment(1) : 1,
          [studyHistory.]: increment(1),
          totalXp: increment(XP_PER_STUDY_MINUTE),
          xpLevel: calculateXpLevel(newXp),
          lastStudyPing: Date.now(),
          lastStudyDate: nowStr
        }).catch(e => console.error("Failed to update study time and XP", e));
      }
    }, 60000);

    return () => {
      clearInterval(heartbeat);
    };'''

new_heartbeat_block = '''    // Local study time tracker (runs every 60s, updates local memory only, NO Firebase writes)
    const studyTimer = setInterval(() => {
      const currentVideo = activeVideoRef.current;
      if (!currentVideo) return;
      
      if (playingRef.current || currentVideo.type === 'resource') {
        recordStudyMinute(); // Buffers locally in AuthContext
      }
    }, 60000);

    // Presence pinger (runs every 5 minutes to vastly reduce Firebase write costs)
    const presenceTimer = setInterval(() => {
      const currentVideo = activeVideoRef.current;
      if (!currentVideo) return;
      
      const presenceRef = doc(db, 'presence', ${currentVideo.id}_);
      setDoc(presenceRef, { videoId: currentVideo.id, userId: user.uid, lastActive: Date.now() }, { merge: true }).catch(() => {});
    }, 300000);

    return () => {
      clearInterval(studyTimer);
      clearInterval(presenceTimer);
    };'''

if old_heartbeat_block in content:
    content = content.replace(old_heartbeat_block, new_heartbeat_block)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("page.tsx updated perfectly")
else:
    print("Could not find exact block, let's try regex or manual")
