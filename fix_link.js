const fs = require('fs');
let code = fs.readFileSync('src/app/admin/live/page.tsx', 'utf-8');

code = code.replace(
  /<Input \s+value=\{link\} \s+onChange=\{e => setLink\(e.target.value\)\} \s+required \s+disabled=\{editingClass\?\.status === 'draft'\} \s+placeholder=\{/g,
  '<Input value={link} onChange={e => setLink(e.target.value)} required={platform !== "webrtc"} disabled={editingClass?.status === "draft" || platform === "webrtc"} placeholder={'
);

fs.writeFileSync('src/app/admin/live/page.tsx', code, 'utf-8');
