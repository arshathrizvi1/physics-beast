import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\lib\AuthContext.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the missing template literal
content = content.replace("setItem(pendingStudyMins_", "setItem(`pendingStudyMins_${user.uid}`")
content = content.replace("removeItem(pendingStudyMins_)", "removeItem(`pendingStudyMins_${user.uid}`)")
content = content.replace("getItem(pendingStudyMins_)", "getItem(`pendingStudyMins_${user.uid}`)")

# Also we must fix AuthContextType interface
old_interface = '''  updateVideoProgress: (videoId: string, percent: number) => Promise<void>;
}'''

new_interface = '''  updateVideoProgress: (videoId: string, percent: number) => Promise<void>;
  recordStudyMinute: () => void;
  syncStudyTimeNow: () => Promise<void>;
}'''
content = content.replace(old_interface, new_interface)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("AuthContext fixed!")
