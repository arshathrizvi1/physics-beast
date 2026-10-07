const fs = require('fs');
let c = fs.readFileSync('src/components/FolderManagerModal.tsx', 'utf8');

c = c.replace(
  /<Button variant="secondary" size="sm" onClick=\{\(\) => openEditForm\(folder\)\} className="flex-1 sm:flex-none">[\s\S]*?<Edit2 className="w-4 h-4 mr-2" \/> Edit[\s\S]*?<\/Button>/,
  `<Button variant="secondary" size="sm" onClick={() => { setFolderToCopy(folder); setIsCopyModalOpen(true); }} className="flex-1 sm:flex-none" title="Copy Folder">
    <Copy className="w-4 h-4" /> 
  </Button>
  <Button variant="secondary" size="sm" onClick={() => openEditForm(folder)} className="flex-1 sm:flex-none">
    <Edit2 className="w-4 h-4 mr-2" /> Edit
  </Button>`
);

fs.writeFileSync('src/components/FolderManagerModal.tsx', c);
console.log('Fixed copy button!');
