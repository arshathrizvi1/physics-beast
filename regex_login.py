import sys
import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\login\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Validation logic
val_pattern = r'if \(!gender\) missingFields\.push\("Gender"\);\s*if \(!stream\) missingFields\.push\("Stream"\);\s*if \(!address\.trim\(\)\) missingFields\.push\("Address"\);\s*if \(!phone\.trim\(\)\) missingFields\.push\("Your Phone Number"\);\s*if \(!parentPhone\.trim\(\)\) missingFields\.push\("Parent\'s Phone Number"\);\s*const selectedBatch = batches\.find\(b => b\.year === graduationYear \|\| b\.id === graduationYear\);\s*const isALBatch = selectedBatch\?\.isAL === true;'

val_replacement = '''if (!gender) missingFields.push("Gender");
          const selectedBatch = batches.find(b => b.year === graduationYear || b.id === graduationYear);
          const isALBatch = selectedBatch?.isAL === true;
          const availableStreams = streams.filter(s => isALBatch ? s.isAL === true : !s.isAL);
          if (isALBatch && availableStreams.length > 0 && !stream) missingFields.push("Stream");
          if (!address.trim()) missingFields.push("Address");
          if (!phone.trim()) missingFields.push("Your Phone Number");
          if (!parentPhone.trim()) missingFields.push("Parent's Phone Number");'''

content = re.sub(val_pattern, val_replacement, content)

# 2. Render vars
ren_pattern = r'const selectedBatchObj = batches\.find\(b => b\.year === graduationYear \|\| b\.id === graduationYear\);\s*const isALBatch = selectedBatchObj\?\.isAL === true;'
ren_replacement = '''const selectedBatchObj = batches.find(b => b.year === graduationYear || b.id === graduationYear);
    const isALBatch = selectedBatchObj?.isAL === true;
    const availableStreamsForBatch = streams.filter(s => isALBatch ? s.isAL === true : !s.isAL);'''

content = re.sub(ren_pattern, ren_replacement, content)

# 3. Stream UI
ui_pattern = r'<div className="space-y-2">\s*<Label>Stream <span className="text-red-500">\*</span></Label>\s*<select\s*className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"\s*value=\{stream\}\s*onChange=\{\(e\) => setStream\(e\.target\.value\)\}\s*required\s*>\s*<option value="" disabled>Select Stream</option>\s*\{streams\.map\(s => \(\s*<option key=\{s\.id\} value=\{s\.name\}>\{s\.name\}</option>\s*\)\)\}\s*</select>\s*</div>'

ui_replacement = '''{availableStreamsForBatch.length > 0 && (
                      <div className="space-y-2">
                        <Label>Stream {isALBatch && <span className="text-red-500">*</span>}</Label>
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={stream}
                          onChange={(e) => setStream(e.target.value)}
                          required={isALBatch}
                        >
                          <option value="" disabled>Select Stream</option>
                          {availableStreamsForBatch.map(s => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    )}'''
content = re.sub(ui_pattern, ui_replacement, content)

# 4. Remove fetch auto select
fetch_pattern = r'setStreams\(data\);\s*if \(data\.length > 0 && !stream\) \{\s*setStream\(data\[0\]\.name\);\s*\}'
fetch_replacement = r'setStreams(data);'
content = re.sub(fetch_pattern, fetch_replacement, content)

# 5. Profile data fix
prof_pattern = r'const profileData = \{ name, dob, school, gender, stream, graduationYear, address, phone, parentPhone, nicNumber \};'
prof_replacement = r'''const finalStream = availableStreams.length > 0 ? stream : "";
            const profileData = { name, dob, school, gender, stream: finalStream, graduationYear, address, phone, parentPhone, nicNumber };'''
content = re.sub(prof_pattern, prof_replacement, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Regex rewrite complete!")
