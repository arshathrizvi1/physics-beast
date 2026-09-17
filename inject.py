import re

with open('src/app/admin/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_statement = '''import CourseManagerModal from "@/components/CourseManagerModal";\nimport FolderManagerModal from "@/components/FolderManagerModal";\n'''

if 'CourseManagerModal' not in content:
    content = content.replace('import { Button } from', import_statement + 'import { Button } from')

state_vars = '''  const [isCourseManagerOpen, setIsCourseManagerOpen] = useState(false);\n  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);\n  const [activeCourseForFolder, setActiveCourseForFolder] = useState<any>(null);\n'''

if 'isCourseManagerOpen' not in content:
    content = content.replace('const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);', state_vars + '  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);')

modals_jsx = '''
      <CourseManagerModal 
        isOpen={isCourseManagerOpen} 
        onClose={() => setIsCourseManagerOpen(false)}
        defaultBatchId={selectedBatchId}
        defaultSubjectId={selectedSubjectId}
        batches={batches}
        subjects={subjects}
        courses={courses}
        teachers={teamMembers.filter(m => m.role === "teacher" || m.role === "admin")}
        folders={folders}
        videos={videos}
        onManageFolders={(courseId) => {
          const c = courses.find(x => x.id === courseId);
          if (c) {
            setActiveCourseForFolder(c);
            setIsFolderManagerOpen(true);
          }
        }}
      />
      <FolderManagerModal 
        isOpen={isFolderManagerOpen} 
        onClose={() => setIsFolderManagerOpen(false)}
        course={activeCourseForFolder}
        folders={folders}
        videos={videos}
      />
'''

if '<CourseManagerModal' not in content:
    content = content.replace('</main>', modals_jsx + '</main>')

with open('src/app/admin/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Injections complete')
