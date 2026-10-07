const fs = require('fs');
let c = fs.readFileSync('src/app/course/[id]/page.tsx', 'utf8');

c = c.replace(
  'const sidebarFolders = (course.isMonthly && selectedMonthlyFolderId) \n    ? visibleFolders.filter(f => f.id === selectedMonthlyFolderId) \n    : folders;',
  `const sidebarFolders = (course.isMonthly && selectedMonthlyFolderId) 
    ? visibleFolders.filter(f => f.id === selectedMonthlyFolderId) 
    : visibleFolders;`
);

c = c.replace(
  'const sidebarFolders = (course.isMonthly && selectedMonthlyFolderId) \r\n    ? visibleFolders.filter(f => f.id === selectedMonthlyFolderId) \r\n    : folders;',
  `const sidebarFolders = (course.isMonthly && selectedMonthlyFolderId) 
    ? visibleFolders.filter(f => f.id === selectedMonthlyFolderId) 
    : visibleFolders;`
);

fs.writeFileSync('src/app/course/[id]/page.tsx', c);
console.log('Fixed sidebarFolders fallback!');
