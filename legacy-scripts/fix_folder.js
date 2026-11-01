const fs = require('fs');
let c = fs.readFileSync('src/components/FolderManagerModal.tsx', 'utf8');

c = c.replace(
  'import { Plus, Edit2, Trash2, Folder, Users, DollarSign } from "lucide-react";',
  `import { Plus, Edit2, Trash2, Folder, Users, DollarSign, Eye, EyeOff, Copy } from "lucide-react";
import { TargetCourseModal } from "./TargetCourseModal";
import { getDocs } from "firebase/firestore";`
);

c = c.replace(
  'const [showForm, setShowForm] = useState(false);',
  `const [showForm, setShowForm] = useState(false);
  const [formIsHidden, setFormIsHidden] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [folderToCopy, setFolderToCopy] = useState(null);
  const [allBatches, setAllBatches] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  
  useEffect(() => {
    if (isCopyModalOpen && allBatches.length === 0) {
      getDocs(collection(db, 'batches')).then(snap => setAllBatches(snap.docs.map(d => ({id: d.id, ...d.data()}))));
      getDocs(collection(db, 'courses')).then(snap => setAllCourses(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    }
  }, [isCopyModalOpen]);
  
  const handleCopySubmit = async (targetCourseId, targetBatchId) => {
    if (!folderToCopy) return;
    try {
      const newFolderId = doc(collection(db, 'folders')).id;
      const payload = {
        name: folderToCopy.name + " (Copy)",
        price: folderToCopy.price || 0,
        courseId: targetCourseId,
        batchId: targetBatchId,
        isHidden: folderToCopy.isHidden || false,
        createdAt: Date.now()
      };
      
      const batchOp = writeBatch(db);
      batchOp.set(doc(db, 'folders', newFolderId), payload);
      
      const folderVideos = videos.filter(v => v.folderId === folderToCopy.id);
      for (const vid of folderVideos) {
        const newVidId = doc(collection(db, 'videos')).id;
        const vidPayload = { ...vid, id: newVidId, folderId: newFolderId, courseId: targetCourseId, batchId: targetBatchId, createdAt: Date.now() };
        batchOp.set(doc(db, 'videos', newVidId), vidPayload);
      }
      
      await batchOp.commit();
      alert("Folder and videos copied successfully!");
    } catch(e) {
      console.error(e);
      alert("Copy failed.");
    }
  };`
);

c = c.replace(
  'const openCreateForm = () => {',
  `const openCreateForm = () => {
    setFormIsHidden(false);`
);

c = c.replace(
  'const openEditForm = (folder: any) => {',
  `const openEditForm = (folder: any) => {
    setFormIsHidden(folder.isHidden || false);`
);

c = c.replace(
  'courseId: course.id,\n        batchId: course.batchId',
  `courseId: course.id,
        batchId: course.batchId,
        isHidden: formIsHidden`
);

c = c.replace(
  '<label className="text-xs font-bold text-muted-foreground uppercase">Price (Rs.)</label>',
  `<label className="text-xs font-bold text-muted-foreground uppercase">Price (Rs.)</label>`
);

c = c.replace(
  `<div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Price (Rs.)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="number" min="0" value={formPrice} onChange={e => setFormPrice(e.target.value)} className="pl-9" placeholder="0 for Free" />
                </div>
              </div>`,
  `<div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Price (Rs.)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="number" min="0" value={formPrice} onChange={e => setFormPrice(e.target.value)} className="pl-9" placeholder="0 for Free" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="isHidden" checked={formIsHidden} onChange={e => setFormIsHidden(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="isHidden" className="text-sm font-medium">Hide from students (Old batch / Archiving)</label>
              </div>`
);

c = c.replace(
  `<h4 className="font-bold text-lg">{folder.name}</h4>`,
  `<h4 className="font-bold text-lg flex items-center gap-2">
                          {folder.isHidden && <EyeOff className="w-4 h-4 text-orange-500" title="Hidden from students" />}
                          {folder.name}
                        </h4>`
);

c = c.replace(
  `<Button variant="secondary" size="sm" onClick={() => openEditForm(folder)} className="flex-1 sm:flex-none">
                          <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </Button>`,
  `<Button variant="secondary" size="sm" onClick={() => { setFolderToCopy(folder); setIsCopyModalOpen(true); }} className="flex-1 sm:flex-none" title="Copy Folder">
                          <Copy className="w-4 h-4" /> 
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => openEditForm(folder)} className="flex-1 sm:flex-none">
                          <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </Button>`
);

c = c.replace(
  `</div>
    </div>
  );
}`,
  `</div>
      <TargetCourseModal 
        isOpen={isCopyModalOpen} 
        onClose={() => setIsCopyModalOpen(false)} 
        onSelect={handleCopySubmit} 
        batches={allBatches} 
        courses={allCourses} 
        title="Copy Folder to Target Course" 
      />
    </div>
  );
}`
);

fs.writeFileSync('src/components/FolderManagerModal.tsx', c);
console.log('FolderManager patched!');
