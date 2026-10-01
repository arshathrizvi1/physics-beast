import sys

# 1. Update Student Portal
path_student = r'C:\Projects\Brilliant Academy\physics-beast\src\app\live\page.tsx'
with open(path_student, 'r', encoding='utf-8') as f:
    content_student = f.read()

target_disabled = """<div className="p-12 bg-zinc-900 min-h-[500px] flex flex-col items-center justify-center text-center">
                          <div className="text-xl font-bold text-amber-500 flex items-center justify-center gap-2 mb-2">
                            <span>🛑</span> Zoom Class Join Disabled
                          </div>
                          <p className="text-muted-foreground max-w-md">
                            The instructor has disabled joining this class directly from the website. 
                          </p>
                        </div>"""
repl_disabled = """<div className="p-12 bg-zinc-900 min-h-[500px] flex flex-col items-center justify-center text-center">
                          <div className="text-xl font-bold text-blue-500 flex items-center justify-center gap-2 mb-4">
                            <Video className="w-6 h-6" /> Join via Zoom App
                          </div>
                          <p className="text-muted-foreground max-w-md mb-8">
                            The instructor has chosen to use the native Zoom application for this class to provide the best experience.
                          </p>
                          <a href={getActiveStream(cls).link} target="_blank" rel="noreferrer">
                            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 px-8 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.3)] animate-pulse hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all">
                              <ExternalLink className="w-5 h-5 mr-2" /> Launch Zoom App
                            </Button>
                          </a>
                        </div>"""

if "Zoom Class Join Disabled" in content_student:
    content_student = content_student.replace(target_disabled, repl_disabled)
    
with open(path_student, 'w', encoding='utf-8') as f:
    f.write(content_student)

# 2. Update Admin Portal Text
path_admin = r'C:\Projects\Brilliant Academy\physics-beast\src\app\admin\live\page.tsx'
with open(path_admin, 'r', encoding='utf-8') as f:
    content_admin = f.read()

content_admin = content_admin.replace(
    "Direct Zoom Join (Option 1)", 
    "Zoom Embedded Player"
)
content_admin = content_admin.replace(
    """{allowDirectJoin 
                          ? "Enabled: Students see the 'JOIN ZOOM MEETING' 1-click button." 
                          : "Disabled: 1-Click button hidden. Students cannot enter your Zoom room directly."}""",
    """{allowDirectJoin 
                          ? "Enabled: Embeds Zoom Player directly inside the website." 
                          : "Disabled: Forces students to open the native Zoom App on their device."}"""
)
content_admin = content_admin.replace(
    """{editAllowDirectJoin 
                            ? "Students see the 'JOIN ZOOM MEETING' 1-click button." 
                            : "1-Click button hidden. Students cannot enter your Zoom room directly."}""",
    """{editAllowDirectJoin 
                            ? "Enabled: Embeds Zoom Player directly inside the website." 
                            : "Disabled: Forces students to open the native Zoom App on their device."}"""
)
content_admin = content_admin.replace(
    """{cls.allowDirectJoin !== false ? "✅ Direct Zoom Join: Enabled" : "❌ Direct Zoom Join: Disabled"}""",
    """{cls.allowDirectJoin !== false ? "✅ Embedded Zoom: Enabled" : "❌ Embedded Zoom: Disabled"}"""
)

with open(path_admin, 'w', encoding='utf-8') as f:
    f.write(content_admin)

print("Done")
