import sys
import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\admin\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Edit button to Batches
old_batch_btn = '''                            <button onClick={(e) => { e.stopPropagation(); handleDeleteBatch(b.id); }} className="p-1 hover:bg-destructive/20 rounded-md text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </button>'''
new_batch_btn = '''                            <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); setEditingBatch(b); }} className="p-1 hover:bg-primary/20 rounded-md text-primary">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteBatch(b.id); }} className="p-1 hover:bg-destructive/20 rounded-md text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>'''
content = content.replace(old_batch_btn, new_batch_btn)

# 2. Add Edit button to Streams
old_stream_btn = '''                            <button onClick={(e) => { e.stopPropagation(); handleDeleteStream(s.id); }} className="p-1 rounded-md transition-colors hover:bg-destructive/20 text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </button>'''
new_stream_btn = '''                            <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); setEditingStream(s); }} className="p-1 rounded-md transition-colors hover:bg-primary/20 text-primary">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteStream(s.id); }} className="p-1 rounded-md transition-colors hover:bg-destructive/20 text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>'''
content = content.replace(old_stream_btn, new_stream_btn)

# 3. Fix the Add Stream form to include the newStreamIsAL checkbox
old_add_stream = '''                      <form onSubmit={handleCreateStream} className="pt-2 border-t space-y-2">
                        <Input placeholder="Stream Name (e.g. Science)" value={newStreamName} onChange={e => setNewStreamName(e.target.value)} required />
                        <Button type="submit" className="w-full" size="sm"><Plus className="w-4 h-4 mr-1" /> Add Stream</Button>
                      </form>'''
new_add_stream = '''                      <form onSubmit={handleCreateStream} className="pt-2 border-t space-y-2">
                        <Input placeholder="Stream Name (e.g. Science)" value={newStreamName} onChange={e => setNewStreamName(e.target.value)} required />
                        <div className="flex items-center space-x-2 my-2">
                          <input type="checkbox" id="isStreamAL" checked={newStreamIsAL} onChange={e => setNewStreamIsAL(e.target.checked)} className="w-4 h-4" />
                          <label htmlFor="isStreamAL" className="text-sm font-medium">This is an A/L Stream</label>
                        </div>
                        <Button type="submit" className="w-full" size="sm"><Plus className="w-4 h-4 mr-1" /> Add Stream</Button>
                      </form>'''
content = content.replace(old_add_stream, new_add_stream)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Buttons and stream form updated!")
