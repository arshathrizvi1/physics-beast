import sys
import re

path_admin = r'C:\Projects\Brilliant Academy\physics-beast\src\app\admin\live\page.tsx'
with open(path_admin, 'r', encoding='utf-8') as f:
    content_admin = f.read()

# Add states
state_target = """const [link, setLink] = useState(""); // Legacy default"""
state_repl = """const [link, setLink] = useState(""); // Legacy default
    const [enableSecondaryZoom, setEnableSecondaryZoom] = useState(false);
    const [secondaryZoomLink, setSecondaryZoomLink] = useState("");"""
content_admin = content_admin.replace(state_target, state_repl)

# Add localStorage logic in useEffect
eff_target = """useEffect(() => {
    // Restore platform cache"""
eff_repl = """useEffect(() => {
    const savedZoomToggle = localStorage.getItem('defaultSecondaryZoomToggle');
    if (savedZoomToggle === 'true') setEnableSecondaryZoom(true);
    
    // Restore platform cache"""
content_admin = content_admin.replace(eff_target, eff_repl)

# Add toggle handler
handler_target = """// Helper to change platform and update cache
  const handlePlatformChange = (val: string) => {"""
handler_repl = """const handleToggleSecondaryZoom = (val: boolean) => {
    setEnableSecondaryZoom(val);
    localStorage.setItem('defaultSecondaryZoomToggle', val.toString());
  };

  // Helper to change platform and update cache
  const handlePlatformChange = (val: string) => {"""
content_admin = content_admin.replace(handler_target, handler_repl)

# Update form UI
ui_target = """{platform !== "zoom" && (
                <div className="space-y-2">
                  <Label>
                    {platform === "zoom" 
                      ? "Zoom Meeting Link *" 
                      : platform === "youtube" 
                      ? "YouTube Live / Video Link *" 
                      : "Live Stream Link *"}
                  </Label>
                  <Input 
                    value={link} 
                    onChange={e => setLink(e.target.value)} 
                    required 
                    disabled={editingClass?.status === 'draft'} 
                    placeholder={
                      platform === "zoom" 
                        ? "https://zoom.us/j/... (or start in Zoom to auto-fill)" 
                        : platform === "youtube" 
                        ? "https://www.youtube.com/watch?v=..." 
                        : "https://..."
                    }
                  />
                  {platform === "zoom" && (
                    <p className="text-[11px] text-muted-foreground">
                      💡 <em>Tip: If you start a meeting directly in Zoom, this link is <strong>automatically filled</strong> for you!</em>
                    </p>
                  )}
                </div>
                )}"""
ui_repl = """{platform !== "zoom" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>
                      {platform === "youtube" ? "YouTube Live / Video Link *" : "Live Stream Link *"}
                    </Label>
                    <Input 
                      value={link} 
                      onChange={e => setLink(e.target.value)} 
                      required 
                      disabled={editingClass?.status === 'draft'} 
                      placeholder={platform === "youtube" ? "https://www.youtube.com/watch?v=..." : "https://..."}
                    />
                  </div>
                  
                  <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 pr-3">
                        <Label className="text-xs font-bold flex items-center gap-1.5 text-blue-500">
                          <Video className="w-3.5 h-3.5" /> Additional Zoom Join Button
                        </Label>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          Show a "Join via Zoom App" button below the video so students can interact.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={enableSecondaryZoom ? "default" : "outline"}
                        className={enableSecondaryZoom ? "bg-blue-600 hover:bg-blue-700 h-8 text-xs shrink-0" : "h-8 text-xs shrink-0"}
                        onClick={() => handleToggleSecondaryZoom(!enableSecondaryZoom)}
                      >
                        {enableSecondaryZoom ? "Enabled" : "Disabled"}
                      </Button>
                    </div>
                    {enableSecondaryZoom && (
                      <Input 
                        value={secondaryZoomLink}
                        onChange={e => setSecondaryZoomLink(e.target.value)}
                        placeholder="Paste Zoom Meeting Link (https://zoom.us/j/...)"
                        className="h-8 text-xs"
                      />
                    )}
                  </div>
                </div>
                )}"""
content_admin = content_admin.replace(ui_target, ui_repl)

# Wait, the UI block has a different emoji in the codebase:
# 💡 => dY'💡 or whatever encoded string. It's safer to use regex to replace that whole block.
