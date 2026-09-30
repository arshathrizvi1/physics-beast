import sys
import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\admin\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Edit button for Batches
batch_pattern = r'<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); handleDeleteBatch\(b\.id\); \}\} className="p-1 hover:bg-destructive/20 rounded-md text-destructive">\s*<Trash2 className="w-4 h-4" />\s*</button>'
batch_replacement = '''<div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); setEditingBatch(b); }} className="p-1 hover:bg-primary/20 rounded-md text-primary">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteBatch(b.id); }} className="p-1 hover:bg-destructive/20 rounded-md text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>'''
content = re.sub(batch_pattern, batch_replacement, content)

# 2. Edit button for Streams
stream_pattern = r'<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); handleDeleteStream\(s\.id\); \}\} className="p-1 rounded-md transition-colors hover:bg-destructive/20 text-destructive">\s*<Trash2 className="w-4 h-4" />\s*</button>'
stream_replacement = '''<div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); setEditingStream(s); }} className="p-1 rounded-md transition-colors hover:bg-primary/20 text-primary">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteStream(s.id); }} className="p-1 rounded-md transition-colors hover:bg-destructive/20 text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>'''
content = re.sub(stream_pattern, stream_replacement, content)

# 3. Add Stream form
form_pattern = r'(<form onSubmit=\{handleCreateStream\} className="pt-2 border-t space-y-2">\s*<Input placeholder="Stream Name \(e\.g\. Science\)" value=\{newStreamName\} onChange=\{e => setNewStreamName\(e\.target\.value\)\} required />)\s*<Button type="submit"'
form_replacement = r'''\1
                        <div className="flex items-center space-x-2 my-2">
                          <input type="checkbox" id="isStreamAL" checked={newStreamIsAL} onChange={e => setNewStreamIsAL(e.target.checked)} className="w-4 h-4" />
                          <label htmlFor="isStreamAL" className="text-sm font-medium">This is an A/L Stream</label>
                        </div>
                        <Button type="submit"'''
content = re.sub(form_pattern, form_replacement, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Regex replace finished!")
