const fs = require('fs');
let code = fs.readFileSync('src/app/admin/live/studio/[id]/page.tsx', 'utf-8');
code = code.replace(/doc\(db, 'liveClasses', params\.id\)/g, "doc(db, 'live_classes', params.id)");
fs.writeFileSync('src/app/admin/live/studio/[id]/page.tsx', code, 'utf-8');
