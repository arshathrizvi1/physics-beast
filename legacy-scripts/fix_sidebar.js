const fs = require('fs');
let c = fs.readFileSync('src/app/course/[id]/page.tsx', 'utf8');

c = c.replace(
  'const sidebarFolders = (course.isMonthly && selectedMonthlyFolderId) \n    ? folders.filter(f => f.id === selectedMonthlyFolderId) \n    : folders;',
  `const sidebarFolders = (course.isMonthly && selectedMonthlyFolderId) 
    ? folders.filter(f => f.id === selectedMonthlyFolderId && (user?.role === 'admin' || user?.role === 'teacher' || !f.isHidden)) 
    : folders.filter(f => user?.role === 'admin' || user?.role === 'teacher' || !f.isHidden);`
);

fs.writeFileSync('src/app/course/[id]/page.tsx', c);
console.log('Fixed sidebarFolders!');
