import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\components\CourseSelectModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("onSelectCourse: (course: any) => void;", "onSelectCourse: (course: any) => void;\n  onBatchChange?: (batchId: string) => void;")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("CourseSelectModal.tsx fixed!")
