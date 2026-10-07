const fs = require('fs');
let c = fs.readFileSync('src/components/CourseManagerModal.tsx', 'utf8');

c = c.replace(
  '<FolderOpen className="w-4 h-4 mr-2" /> Folders\n                        </Button>',
  `<FolderOpen className="w-4 h-4 mr-2" /> Folders
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setCourseToCopy(course); setIsCopyCourseModalOpen(true); }} className="flex-none px-2" title="Copy Course">
                          <Copy className="w-4 h-4" />
                        </Button>`
);
c = c.replace(
  '<FolderOpen className="w-4 h-4 mr-2" /> Folders\r\n                        </Button>',
  `<FolderOpen className="w-4 h-4 mr-2" /> Folders
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setCourseToCopy(course); setIsCopyCourseModalOpen(true); }} className="flex-none px-2" title="Copy Course">
                          <Copy className="w-4 h-4" />
                        </Button>`
);

fs.writeFileSync('src/components/CourseManagerModal.tsx', c);
console.log('Fixed button CourseManagerModal!');
