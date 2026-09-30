import sys
import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\login\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Modify the validation logic
old_validation = '''          if (!gender) missingFields.push("Gender");
          if (!stream) missingFields.push("Stream");
          if (!address.trim()) missingFields.push("Address");
          if (!phone.trim()) missingFields.push("Your Phone Number");
          if (!parentPhone.trim()) missingFields.push("Parent's Phone Number");
          const selectedBatch = batches.find(b => b.year === graduationYear || b.id === graduationYear);
            const isALBatch = selectedBatch?.isAL === true;'''

new_validation = '''          if (!gender) missingFields.push("Gender");
          const selectedBatch = batches.find(b => b.year === graduationYear || b.id === graduationYear);
          const isALBatch = selectedBatch?.isAL === true;
          const availableStreams = streams.filter(s => isALBatch ? s.isAL === true : !s.isAL);
          if (isALBatch && availableStreams.length > 0 && !stream) missingFields.push("Stream");
          if (!address.trim()) missingFields.push("Address");
          if (!phone.trim()) missingFields.push("Your Phone Number");
          if (!parentPhone.trim()) missingFields.push("Parent's Phone Number");'''
content = content.replace(old_validation, new_validation)

# 2. Add availableStreams to render phase
old_render_vars = '''    // Login/Signup View
    const selectedBatchObj = batches.find(b => b.year === graduationYear || b.id === graduationYear);
    const isALBatch = selectedBatchObj?.isAL === true;'''

new_render_vars = '''    // Login/Signup View
    const selectedBatchObj = batches.find(b => b.year === graduationYear || b.id === graduationYear);
    const isALBatch = selectedBatchObj?.isAL === true;
    const availableStreamsForBatch = streams.filter(s => isALBatch ? s.isAL === true : !s.isAL);'''
content = content.replace(old_render_vars, new_render_vars)

# 3. Modify the Stream UI box
old_stream_ui = '''                    <div className="space-y-2">
                      <Label>Stream <span className="text-red-500">*</span></Label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={stream}
                        onChange={(e) => setStream(e.target.value)}
                        required
                      >
                        <option value="" disabled>Select Stream</option>
                        {streams.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>'''

new_stream_ui = '''                    {availableStreamsForBatch.length > 0 && (
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
content = content.replace(old_stream_ui, new_stream_ui)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated stream validation and UI logic!")
