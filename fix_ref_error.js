const fs = require('fs');
let c = fs.readFileSync('src/app/course/[id]/page.tsx', 'utf8');

c = c.replace(
  "const visibleFolders = visibleFolders.filter(f => user?.role === 'admin' || user?.role === 'teacher' || !f.isHidden || (user?.folderAccess?.[f.id] && user.folderAccess[f.id] > Date.now()));",
  "const visibleFolders = folders.filter(f => user?.role === 'admin' || user?.role === 'teacher' || !f.isHidden || (user?.folderAccess?.[f.id] && user.folderAccess[f.id] > Date.now()));"
);

fs.writeFileSync('src/app/course/[id]/page.tsx', c);
console.log('Fixed visibleFolders!');
