const fs = require('fs');
let c = fs.readFileSync('src/components/FolderManagerModal.tsx', 'utf8');

c = c.replace(
  /<div className="relative">[\s\S]*?<DollarSign className="absolute left-3 top-1\/2 -translate-y-1\/2 w-4 h-4 text-muted-foreground" \/>[\s\S]*?<Input type="number" min="0" value=\{formPrice\} onChange=\{e => setFormPrice\(e.target.value\)\} className="pl-9" placeholder="0 for Free" \/>[\s\S]*?<\/div>[\s\S]*?<\/div>/m,
  `<div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="number" min="0" value={formPrice} onChange={e => setFormPrice(e.target.value)} className="pl-9" placeholder="0 for Free" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="isHidden" checked={formIsHidden} onChange={e => setFormIsHidden(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="isHidden" className="text-sm font-medium">Hide from students (Old batch / Archiving)</label>
              </div>`
);

fs.writeFileSync('src/components/FolderManagerModal.tsx', c);
console.log('Fixed checkbox!');
