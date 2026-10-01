import sys
import re

path_student = r'C:\Projects\Brilliant Academy\physics-beast\src\app\live\page.tsx'
with open(path_student, 'r', encoding='utf-8') as f:
    content_student = f.read()

# Replace the disabled block
pattern = r'<div className="p-12 bg-zinc-900 min-h-\[500px\] flex flex-col items-center justify-center text-center">\s*<div className="text-xl font-bold text-amber-500 flex items-center justify-center gap-2 mb-2">\s*<span>.*?</span> Zoom Class Join Disabled\s*</div>\s*<p className="text-muted-foreground max-w-md">\s*The instructor has disabled joining this class directly from the website\.\s*</p>\s*</div>'

repl = """<div className="p-12 bg-zinc-900 min-h-[500px] flex flex-col items-center justify-center text-center">
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

content_student = re.sub(pattern, repl, content_student, flags=re.DOTALL)

with open(path_student, 'w', encoding='utf-8') as f:
    f.write(content_student)

print("Replaced!")
