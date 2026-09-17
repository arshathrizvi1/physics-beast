with open('src/app/admin/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the onClick handler for Subjects
content = content.replace('onClick={() => { setSelectedSubjectId(s.id); setSelectedCourseId(null); }}', 'onClick={() => { setSelectedSubjectId(s.id); setIsCourseManagerOpen(true); }}')

# Add the 'Manage All Courses' button above the grid
button_jsx = '''<div className="flex justify-between items-center mb-6">\n                  <div>\n                    <h2 className="text-2xl font-bold text-primary">Library & Curriculum</h2>\n                    <p className="text-sm text-muted-foreground">Select a Batch and Subject to manage courses.</p>\n                  </div>\n                  <Button onClick={() => { setSelectedBatchId(null); setSelectedSubjectId(null); setIsCourseManagerOpen(true); }} className="gap-2">\n                    <FolderOpen className="w-4 h-4" /> Manage All Courses\n                  </Button>\n                </div>\n                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">'''

content = content.replace('<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">', button_jsx)

with open('src/app/admin/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Subject handler and button added')
