import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\admin\live\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Add useSearchParams dependency
content = content.replace(
    "import { useRouter } from 'next/navigation';",
    "import { useRouter, useSearchParams } from 'next/navigation';"
)

content = content.replace(
    "const router = useRouter();",
    "const router = useRouter();\n  const searchParams = useSearchParams();"
)

content = content.replace(
    "const searchParams = new URLSearchParams(window.location.search);",
    "// using next/navigation searchParams instead"
)

content = content.replace(
    "}, [liveClasses]);",
    "}, [liveClasses, searchParams]);"
)

# Fix 2: Make the Gear Icon (Settings) populate the main form for Drafts!
target_gear = """setEditingClass(cls);
                          setEditTitle(cls.title);"""

replacement_gear = """setEditingClass(cls);
                          if (cls.status === 'draft') {
                            setTitle(cls.title || "");
                            setDescription(cls.description || "");
                            setPlatform(cls.platform || "zoom");
                            setLink(cls.link || "");
                            if (cls.scheduledFor) {
                              const date = new Date(cls.scheduledFor);
                              const formatted = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
                              setScheduledFor(formatted);
                            }
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          } else {
                            setEditTitle(cls.title);"""

# Fix the closing brace for the else block! We need to find the end of that onClick handler.
# The onClick handler ends with:
#                           setEditTargetFolderId(cls.targetFolderId || "none");
#                           setEditAllowDirectJoin(cls.allowDirectJoin !== false);
#                         }}

target_gear_end = """setEditTargetFolderId(cls.targetFolderId || "none");
                          setEditAllowDirectJoin(cls.allowDirectJoin !== false);
                        }}"""
replacement_gear_end = """setEditTargetFolderId(cls.targetFolderId || "none");
                          setEditAllowDirectJoin(cls.allowDirectJoin !== false);
                          }
                        }}"""

content = content.replace(target_gear, replacement_gear)
content = content.replace(target_gear_end, replacement_gear_end)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched UI state bug successfully!")
