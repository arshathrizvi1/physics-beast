import sys
import re

path_admin = r'C:\Projects\Brilliant Academy\physics-beast\src\app\admin\live\page.tsx'
with open(path_admin, 'r', encoding='utf-8') as f:
    content = f.read()

# Add states
state_target = """const [link, setLink] = useState(""); // Legacy default"""
if "setEnableSecondaryZoom" not in content:
    content = content.replace(state_target, state_target + """\n    const [enableSecondaryZoom, setEnableSecondaryZoom] = useState(false);\n    const [secondaryZoomLink, setSecondaryZoomLink] = useState("");""")

# Add localStorage logic in useEffect
eff_target = """useEffect(() => {
    // Restore platform cache"""
if "defaultSecondaryZoomToggle" not in content:
    content = content.replace(eff_target, """useEffect(() => {\n    const savedZoomToggle = localStorage.getItem('defaultSecondaryZoomToggle');\n    if (savedZoomToggle === 'true') setEnableSecondaryZoom(true);\n    // Restore platform cache""")

# Add toggle handler
handler_target = """// Helper to change platform and update cache"""
if "handleToggleSecondaryZoom" not in content:
    content = content.replace(handler_target, """const handleToggleSecondaryZoom = (val: boolean) => {\n    setEnableSecondaryZoom(val);\n    localStorage.setItem('defaultSecondaryZoomToggle', val.toString());\n  };\n\n  // Helper to change platform and update cache""")

# Regex for UI replacement
ui_pattern = r'\{platform !== "zoom" && \(\s*<div className="space-y-2">\s*<Label>.*?<\/div>\s*\)\}'
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
                          Show a "Join via Zoom App" button below the video.
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
                        className="h-8 text-xs bg-background"
                      />
                    )}
                  </div>
                </div>
                )}"""
content = re.sub(ui_pattern, ui_repl, content, flags=re.DOTALL)

# Add to classData
save_pattern = r'allowDirectJoin,\s*\.\.\.\(platform === \'rtmp\' \? \{ streamKey: rtmpStreamKey \} : \{\}\),'
save_repl = """allowDirectJoin,
          enableSecondaryZoom: platform !== 'zoom' ? enableSecondaryZoom : false,
          secondaryZoomLink: platform !== 'zoom' ? secondaryZoomLink : "",
          ...(platform === 'rtmp' ? { streamKey: rtmpStreamKey } : {}),"""
content = re.sub(save_pattern, save_repl, content)

# Clear states on submit
clear_pattern = r'setLink\(""\);\s*setMultiStreams\(\{'
clear_repl = """setLink("");
        setSecondaryZoomLink("");
        setMultiStreams({"""
content = re.sub(clear_pattern, clear_repl, content)

# Populate on Edit
edit_pattern = r'setLink\(cls\.link\);\s*if \(cls\.multiStreams\)'
edit_repl = """setLink(cls.link);
                          setEnableSecondaryZoom(cls.enableSecondaryZoom || false);
                          setSecondaryZoomLink(cls.secondaryZoomLink || "");
                          if (cls.multiStreams)"""
content = re.sub(edit_pattern, edit_repl, content)

# Populate on Draft
draft_pattern = r'setLink\(draft\.link \|\| ""\);\s*if \(draft\.multiStreams\)'
draft_repl = """setLink(draft.link || "");
            setEnableSecondaryZoom(draft.enableSecondaryZoom || false);
            setSecondaryZoomLink(draft.secondaryZoomLink || "");
            if (draft.multiStreams)"""
content = re.sub(draft_pattern, draft_repl, content)

with open(path_admin, 'w', encoding='utf-8') as f:
    f.write(content)

# Update student portal page
path_student = r'C:\Projects\Brilliant Academy\physics-beast\src\app\live\page.tsx'
with open(path_student, 'r', encoding='utf-8') as f:
    content_student = f.read()

# Add the Zoom button below the stream tabs
student_pattern = r'\{/\* Secret Chat Box for Live Classes \*/\}'
student_repl = """{/* Secondary Zoom Join Button for YouTube/RTMP streams */}
                {cls.enableSecondaryZoom && cls.secondaryZoomLink && cls.status === 'live' && getActiveStream(cls).id !== 'zoom' && (
                  <div className="p-4 bg-zinc-900 border-t border-border/30 flex justify-center">
                    <a href={cls.secondaryZoomLink} target="_blank" rel="noreferrer">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-8 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.3)] animate-pulse hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all flex items-center gap-2">
                        <Video className="w-5 h-5" />
                        Join Zoom Meeting Directly
                      </Button>
                    </a>
                  </div>
                )}
                
                {/* Secret Chat Box for Live Classes */}"""
if "Join Zoom Meeting Directly" not in content_student:
    content_student = content_student.replace("{/* Secret Chat Box for Live Classes */}", student_repl)

with open(path_student, 'w', encoding='utf-8') as f:
    f.write(content_student)

print("Done")
