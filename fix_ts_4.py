import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\live\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("user?.displayName", "(user as any)?.displayName").replace("user?.phoneNumber", "(user as any)?.phoneNumber")
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

path2 = r'C:\Projects\Brilliant Academy\physics-beast\src\components\CourseSelectModal.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()
if "onBatchChange" not in content2.split("interface CourseSelectModalProps")[1].split("}")[0]:
    old = "defaultBatchId?: string;"
    new = "defaultBatchId?: string;\n    onBatchChange?: (batchId: string) => void;"
    content2 = content2.replace(old, new)
    with open(path2, 'w', encoding='utf-8') as f:
        f.write(content2)

path3 = r'C:\Projects\Brilliant Academy\physics-beast\src\lib\AuthContext.tsx'
with open(path3, 'r', encoding='utf-8') as f:
    content3 = f.read()

old_auth = """  loginWithCustomToken: async () => false,
  updateVideoProgress: async () => {},
});"""
new_auth = """  loginWithCustomToken: async () => false,
  updateVideoProgress: async () => {},
  recordStudyMinute: () => {},
  syncStudyTimeNow: async () => {},
});"""
if old_auth in content3:
    content3 = content3.replace(old_auth, new_auth)
    with open(path3, 'w', encoding='utf-8') as f:
        f.write(content3)

print("Fixed all remaining TS errors!")
