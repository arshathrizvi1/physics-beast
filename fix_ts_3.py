import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\live\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("user.displayName", "(user as any).displayName").replace("user.phoneNumber", "(user as any).phoneNumber")
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

path2 = r'C:\Projects\Brilliant Academy\physics-beast\src\components\CourseSelectModal.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()
if "onBatchChange" not in content2:
    old = "onSelectCourse: (course: any) => void;"
    new = "onSelectCourse: (course: any) => void;\n  onBatchChange?: (batchId: string) => void;"
    content2 = content2.replace(old, new)
    with open(path2, 'w', encoding='utf-8') as f:
        f.write(content2)

print("Fixed live page and course modal")
