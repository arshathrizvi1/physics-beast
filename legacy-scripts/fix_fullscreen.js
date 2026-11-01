const fs = require('fs');
let code = fs.readFileSync('src/app/admin/live/studio/[id]/page.tsx', 'utf-8');
code = code.replace(
  'className="min-h-screen bg-zinc-950 flex flex-col text-white"',
  'className="fixed inset-0 z-50 bg-zinc-950 flex flex-col text-white"'
);
fs.writeFileSync('src/app/admin/live/studio/[id]/page.tsx', code, 'utf-8');
