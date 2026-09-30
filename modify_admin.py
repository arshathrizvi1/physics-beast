import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\admin\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add new state variables
state_injection_point = 'const [newStreamName, setNewStreamName] = useState("");'
if state_injection_point in content:
    content = content.replace(state_injection_point, '''const [newStreamName, setNewStreamName] = useState("");
  const [newStreamIsAL, setNewStreamIsAL] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const [editingStream, setEditingStream] = useState<any>(null);''')

# 2. Update handleCreateStream
old_create_stream = '''  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreamName) return;
    try {
      const ref = doc(collection(db, 'streams'));
      await setDoc(ref, { name: newStreamName, createdAt: Date.now() });
      setNewStreamName("");
    } catch (err) {
      console.error(err);
    }
  };'''

new_create_stream = '''  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreamName) return;
    try {
      const ref = doc(collection(db, 'streams'));
      await setDoc(ref, { name: newStreamName, isAL: newStreamIsAL, createdAt: Date.now() });
      setNewStreamName("");
      setNewStreamIsAL(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;
    try {
      await updateDoc(doc(db, 'batches', editingBatch.id), {
        name: editingBatch.name,
        year: editingBatch.year,
        isAL: editingBatch.isAL || false
      });
      setEditingBatch(null);
    } catch (err) { console.error(err); }
  };

  const handleUpdateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStream) return;
    try {
      await updateDoc(doc(db, 'streams', editingStream.id), {
        name: editingStream.name,
        isAL: editingStream.isAL || false
      });
      setEditingStream(null);
    } catch (err) { console.error(err); }
  };'''

content = content.replace(old_create_stream, new_create_stream)

# 3. Add edit button to batches
old_batch_item = '''                            <button onClick={(e) => { e.stopPropagation(); handleDeleteBatch(b.id); }} className="p-1 hover:bg-destructive/20 rounded-md text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </button>'''

new_batch_item = '''                            <div className="flex gap-1">
                              <button onClick={(e) => { e.stopPropagation(); setEditingBatch(b); }} className={p-1.5 rounded-md transition-colors }>
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteBatch(b.id); }} className="p-1.5 hover:bg-destructive/20 rounded-md text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>'''

content = content.replace(old_batch_item, new_batch_item)

# 4. Update stream item to include edit button
old_stream_item = '''                            <button onClick={(e) => { e.stopPropagation(); handleDeleteStream(s.id); }} className="p-1 hover:bg-destructive/20 rounded-md text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </button>'''

new_stream_item = '''                            <div className="flex gap-1">
                              {s.isAL && <span className="text-[10px] bg-red-500/20 text-red-500 px-1 rounded my-auto mr-1 font-bold">A/L</span>}
                              <button onClick={(e) => { e.stopPropagation(); setEditingStream(s); }} className={p-1.5 rounded-md transition-colors hover:bg-secondary/60 text-primary}>
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteStream(s.id); }} className="p-1.5 hover:bg-destructive/20 rounded-md text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>'''

content = content.replace(old_stream_item, new_stream_item)

# 5. Add checkbox to stream creation form
old_stream_form = '''                      <form onSubmit={handleCreateStream} className="pt-2 border-t space-y-2">
                        <Input placeholder="Stream Name (e.g. Science)" value={newStreamName} onChange={e => setNewStreamName(e.target.value)} required />
                        <Button type="submit" className="w-full" size="sm"><Plus className="w-4 h-4 mr-1" /> Add Stream</Button>
                      </form>'''

new_stream_form = '''                      <form onSubmit={handleCreateStream} className="pt-2 border-t space-y-2">
                        <Input placeholder="Stream Name (e.g. Science)" value={newStreamName} onChange={e => setNewStreamName(e.target.value)} required />
                        <div className="flex items-center space-x-2 my-2"><input type="checkbox" id="isStreamAL" checked={newStreamIsAL} onChange={e => setNewStreamIsAL(e.target.checked)} className="w-4 h-4" /><label htmlFor="isStreamAL" className="text-sm font-medium">For A/L Students</label></div>
                        <Button type="submit" className="w-full" size="sm"><Plus className="w-4 h-4 mr-1" /> Add Stream</Button>
                      </form>'''

content = content.replace(old_stream_form, new_stream_form)

# 6. Add Modals for editing at the bottom of the page
modal_injection = '''        <SubjectManagerModal'''

modals_html = '''        {/* EDIT BATCH MODAL */}
        {editingBatch && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-background border border-border shadow-2xl rounded-xl w-full max-w-md overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center bg-secondary/10">
                <h3 className="font-bold text-lg">Edit Batch</h3>
                <button onClick={() => setEditingBatch(null)} className="p-1 hover:bg-secondary rounded"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleUpdateBatch} className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Batch Name</label>
                  <Input value={editingBatch.name || ''} onChange={e => setEditingBatch({...editingBatch, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">Year</label>
                  <Input value={editingBatch.year || ''} onChange={e => setEditingBatch({...editingBatch, year: e.target.value})} required />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <input type="checkbox" id="editIsAL" checked={editingBatch.isAL || false} onChange={e => setEditingBatch({...editingBatch, isAL: e.target.checked})} className="w-5 h-5" />
                  <label htmlFor="editIsAL" className="text-sm font-bold">This is an A/L Batch (Requires NIC verification)</label>
                </div>
                <Button type="submit" className="w-full mt-4">Save Changes</Button>
              </form>
            </div>
          </div>
        )}

        {/* EDIT STREAM MODAL */}
        {editingStream && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-background border border-border shadow-2xl rounded-xl w-full max-w-md overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center bg-secondary/10">
                <h3 className="font-bold text-lg">Edit Stream</h3>
                <button onClick={() => setEditingStream(null)} className="p-1 hover:bg-secondary rounded"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleUpdateStream} className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Stream Name</label>
                  <Input value={editingStream.name || ''} onChange={e => setEditingStream({...editingStream, name: e.target.value})} required />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <input type="checkbox" id="editStreamIsAL" checked={editingStream.isAL || false} onChange={e => setEditingStream({...editingStream, isAL: e.target.checked})} className="w-5 h-5" />
                  <label htmlFor="editStreamIsAL" className="text-sm font-bold">For A/L Students</label>
                </div>
                <Button type="submit" className="w-full mt-4">Save Changes</Button>
              </form>
            </div>
          </div>
        )}

        <SubjectManagerModal'''

content = content.replace(modal_injection, modals_html)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Admin modifications complete")
