import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\course\[id]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

start_str = "    // Ping every 60 seconds of wall-clock time"
end_str = "  }, [user?.uid]); // Removed activeVideo and playing from deps so interval never resets!"

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx == -1 or end_idx == -1:
    print(f"Failed. Start: {start_idx}, End: {end_idx}")
    sys.exit(1)

new_block = '''    // Local study time tracker (runs every 60s, updates local memory only, NO Firebase writes)
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
    };
'''

content = content[:start_idx] + new_block + content[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced!")
