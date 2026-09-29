import re

with open('src/app/login/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

render_injection = r'''
  // Login/Signup View
  const selectedBatchObj = batches.find(b => b.year === graduationYear || b.id === graduationYear);
  const isALBatch = selectedBatchObj?.isAL === true;
'''
content = content.replace('// Login/Signup View', render_injection)

# Replace NIC Number HTML
content = content.replace(
    '<Label htmlFor="student-nic-number">NIC Number <span className="text-red-500">*</span></Label>',
    '<Label htmlFor="student-nic-number">NIC Number {isALBatch && <span className="text-red-500">*</span>}</Label>'
)

content = content.replace(
    'onChange={(e) => setNicNumber(e.target.value)}\n                      required',
    'onChange={(e) => setNicNumber(e.target.value)}\n                      required={isALBatch}'
)

# Replace NIC Image HTML
content = content.replace(
    '<Label htmlFor="student-nic">NIC Image <span className="text-red-500">*</span></Label>',
    '<Label htmlFor="student-nic">NIC Image {isALBatch && <span className="text-red-500">*</span>}</Label>'
)

content = content.replace(
    'onChange={(e) => setNicFile(e.target.files ? e.target.files[0] : null)}\n                      required',
    'onChange={(e) => setNicFile(e.target.files ? e.target.files[0] : null)}\n                      required={isALBatch}'
)

with open('src/app/login/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
