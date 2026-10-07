const fs = require('fs');
let code = fs.readFileSync('src/app/admin/live/page.tsx', 'utf-8');
code = code.replace(/href="\/live"/g, 'href={`/admin/live/studio/${cls.id}`}');
fs.writeFileSync('src/app/admin/live/page.tsx', code, 'utf-8');
