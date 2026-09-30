import sys
import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\login\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'<div className="grid grid-cols-1 md:grid-cols-2 gap-4">.*?<Label htmlFor="student-nic-number">.*?</div>\s*</div>', re.DOTALL)

replacement = '''                  {isALBatch && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="student-nic-number">NIC Number <span className="text-red-500">*</span></Label>
                        <Input 
                          id="student-nic-number" 
                          type="number"
                          placeholder="e.g. 2005..." 
                          value={nicNumber}
                          onChange={(e) => setNicNumber(e.target.value)}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="student-nic">NIC Image <span className="text-red-500">*</span></Label>
                        <Input 
                          id="student-nic" 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => setNicFile(e.target.files ? e.target.files[0] : null)}
                          required
                        />
                      </div>
                    </div>
                  )}'''

if pattern.search(content):
    content = pattern.sub(replacement, content)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced nicely")
else:
    print("Pattern not found")

