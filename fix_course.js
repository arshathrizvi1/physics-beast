const fs = require('fs');
let c = fs.readFileSync('src/app/course/[id]/page.tsx', 'utf8');

c = c.replace(
  'const legacyCourseAccess = user?.accessibleCourses && user.accessibleCourses.includes(id);',
  `const visibleFolders = folders.filter(f => user?.role === 'admin' || user?.role === 'teacher' || !f.isHidden || (user?.folderAccess?.[f.id] && user.folderAccess[f.id] > Date.now()));
  const legacyCourseAccess = user?.accessibleCourses && user.accessibleCourses.includes(id);`
);

c = c.replace(/folders\.filter/g, 'visibleFolders.filter');
c = c.replace(/folders\.length/g, 'visibleFolders.length');
c = c.replace(/folders\.find/g, 'visibleFolders.find');
c = c.replace(/folders\.map/g, 'visibleFolders.map');
c = c.replace(/folders\.some/g, 'visibleFolders.some');
c = c.replace('const courseFolders = folders;', 'const courseFolders = visibleFolders;');
c = c.replace('let displayFolders = folders;', 'let displayFolders = visibleFolders;');

c = c.replace(
  `const sidebarFolders = (course.isMonthly && selectedMonthlyFolderId) \n    ? visibleFolders.filter(f => f.id === selectedMonthlyFolderId && (user?.role === 'admin' || user?.role === 'teacher' || !f.isHidden)) \n    : visibleFolders.filter(f => user?.role === 'admin' || user?.role === 'teacher' || !f.isHidden);`,
  `const sidebarFolders = (course.isMonthly && selectedMonthlyFolderId) \n    ? visibleFolders.filter(f => f.id === selectedMonthlyFolderId) \n    : visibleFolders;`
);

c = c.replace(
  `const sidebarFolders = (course.isMonthly && selectedMonthlyFolderId) \r\n    ? visibleFolders.filter(f => f.id === selectedMonthlyFolderId && (user?.role === 'admin' || user?.role === 'teacher' || !f.isHidden)) \r\n    : visibleFolders.filter(f => user?.role === 'admin' || user?.role === 'teacher' || !f.isHidden);`,
  `const sidebarFolders = (course.isMonthly && selectedMonthlyFolderId) \n    ? visibleFolders.filter(f => f.id === selectedMonthlyFolderId) \n    : visibleFolders;`
);

// We need to NOT replace folders in the useEffect dependencies
c = c.replace('if (!user || visibleFolders.length === 0 || hasAutoOpenedRef.current) return;', 'if (!user || folders.length === 0 || hasAutoOpenedRef.current) return;');

fs.writeFileSync('src/app/course/[id]/page.tsx', c);
console.log('Fixed course page!');
