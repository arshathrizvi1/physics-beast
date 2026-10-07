const fs = require('fs');
let c = fs.readFileSync('src/components/CourseManagerModal.tsx', 'utf8');

if (!c.includes('import { TargetTeacherModal }')) {
  c = c.replace('import { Search, Plus, User, Image as ImageIcon, Video, Edit2, FolderOpen, Trash2 } from "lucide-react";', 
  `import { Search, Plus, User, Image as ImageIcon, Video, Edit2, FolderOpen, Trash2, Copy } from "lucide-react";
import { TargetTeacherModal } from "./TargetTeacherModal";`);
}

if (!c.includes('isCopyCourseModalOpen')) {
  c = c.replace('const [searchQuery, setSearchQuery] = useState("");',
  `const [searchQuery, setSearchQuery] = useState("");
  const [isCopyCourseModalOpen, setIsCopyCourseModalOpen] = useState(false);
  const [courseToCopy, setCourseToCopy] = useState(null);
  
  const handleCopyCourseSubmit = async (targetTeacherId, targetSubjectId, targetBatchId) => {
    if (!courseToCopy) return;
    try {
      const newCourseId = doc(collection(db, 'courses')).id;
      const coursePayload = {
        ...courseToCopy,
        id: newCourseId,
        name: courseToCopy.name + " (Copy)",
        teacherId: targetTeacherId,
        subjectId: targetSubjectId,
        batchId: targetBatchId,
        createdAt: Date.now()
      };
      
      const batchOp = writeBatch(db);
      batchOp.set(doc(db, 'courses', newCourseId), coursePayload);
      
      // Also copy all folders and videos
      const courseFolders = folders.filter(f => f.courseId === courseToCopy.id);
      for (const folder of courseFolders) {
        const newFolderId = doc(collection(db, 'folders')).id;
        batchOp.set(doc(db, 'folders', newFolderId), {
          ...folder,
          id: newFolderId,
          courseId: newCourseId,
          batchId: targetBatchId,
          createdAt: Date.now()
        });
        
        const folderVideos = videos.filter(v => v.folderId === folder.id);
        for (const vid of folderVideos) {
          const newVidId = doc(collection(db, 'videos')).id;
          batchOp.set(doc(db, 'videos', newVidId), {
            ...vid,
            id: newVidId,
            folderId: newFolderId,
            courseId: newCourseId,
            batchId: targetBatchId,
            createdAt: Date.now()
          });
        }
      }
      
      await batchOp.commit();
      alert("Course, folders, and videos copied successfully!");
    } catch (e) {
      console.error(e);
      alert("Copy failed.");
    }
  };`);
}

c = c.replace(
  /<Button variant="ghost" size="sm" onClick=\{\(\) => onManageFolders\(course\.id\)\} className="flex-1 sm:flex-none">[\s\S]*?<FolderOpen className="w-4 h-4 mr-2" \/> Folders[\s\S]*?<\/Button>/,
  `<Button variant="ghost" size="sm" onClick={() => onManageFolders(course.id)} className="flex-1 sm:flex-none">
                          <FolderOpen className="w-4 h-4 mr-2" /> Folders
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setCourseToCopy(course); setIsCopyCourseModalOpen(true); }} className="flex-none px-2" title="Copy Course">
                          <Copy className="w-4 h-4" />
                        </Button>`
);

c = c.replace(
  '      </div>\n    </div>\n  );\n}',
  `      </div>
      <TargetTeacherModal 
        isOpen={isCopyCourseModalOpen} 
        onClose={() => setIsCopyCourseModalOpen(false)} 
        onSelect={handleCopyCourseSubmit} 
        batches={batches} 
        title="Copy Course to Target" 
      />
    </div>
  );
}`
);

c = c.replace(
  '      </div>\r\n    </div>\r\n  );\r\n}',
  `      </div>
      <TargetTeacherModal 
        isOpen={isCopyCourseModalOpen} 
        onClose={() => setIsCopyCourseModalOpen(false)} 
        onSelect={handleCopyCourseSubmit} 
        batches={batches} 
        title="Copy Course to Target" 
      />
    </div>
  );
}`
);

fs.writeFileSync('src/components/CourseManagerModal.tsx', c);
console.log('Fixed CourseManagerModal!');
