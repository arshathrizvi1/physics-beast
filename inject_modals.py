import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\admin\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_modals_end = '''      <FolderManagerModal 
        isOpen={isFolderManagerOpen} 
        onClose={() => setIsFolderManagerOpen(false)}
        course={activeCourseForFolder}
        folders={folders}
        videos={videos}
      />
    </div>
  );
}'''

new_modals_end = '''      <FolderManagerModal 
        isOpen={isFolderManagerOpen} 
        onClose={() => setIsFolderManagerOpen(false)}
        course={activeCourseForFolder}
        folders={folders}
        videos={videos}
      />

      {/* Edit Batch Modal */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-border/50 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-lg">Edit Batch</h3>
              <button onClick={() => setEditingBatch(null)} className="p-1 hover:bg-secondary rounded-md"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleUpdateBatch} className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Batch Name</Label>
                <Input value={editingBatch.name} onChange={(e) => setEditingBatch({...editingBatch, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input value={editingBatch.year} onChange={(e) => setEditingBatch({...editingBatch, year: e.target.value})} required />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input type="checkbox" id="editBatchIsAL" checked={editingBatch.isAL || false} onChange={e => setEditingBatch({...editingBatch, isAL: e.target.checked})} className="w-4 h-4" />
                <label htmlFor="editBatchIsAL" className="text-sm font-medium">This is an A/L Batch (Requires NIC verification)</label>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="button" variant="outline" className="mr-2" onClick={() => setEditingBatch(null)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stream Modal */}
      {editingStream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-border/50 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-lg">Edit Global Stream</h3>
              <button onClick={() => setEditingStream(null)} className="p-1 hover:bg-secondary rounded-md"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleUpdateStream} className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Stream Name</Label>
                <Input value={editingStream.name} onChange={(e) => setEditingStream({...editingStream, name: e.target.value})} required />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input type="checkbox" id="editStreamIsAL" checked={editingStream.isAL || false} onChange={e => setEditingStream({...editingStream, isAL: e.target.checked})} className="w-4 h-4" />
                <label htmlFor="editStreamIsAL" className="text-sm font-medium">This is an A/L Stream (Shows in A/L Batches)</label>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="button" variant="outline" className="mr-2" onClick={() => setEditingStream(null)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}'''

if old_modals_end in content:
    content = content.replace(old_modals_end, new_modals_end)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Modals injected successfully!")
else:
    print("Could not find the modals injection point.")
