import sys

path_tsx = r'C:\Projects\Brilliant Academy\physics-beast\src\app\course\[id]\page.tsx'
with open(path_tsx, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("if (res.status === 403) setBunnyEmbedUrl('CRACKED');", "if (res.status === 403) { const errData = await res.json().catch(() => ({})); setBunnyEmbedUrl('CRACKED:' + (errData.error || 'Unknown 403')); return; }")

content = content.replace("bunnyEmbedUrl === 'CRACKED' ? (", "bunnyEmbedUrl.startsWith('CRACKED') ? (")

content = content.replace("<p className=\"text-zinc-400\">Video playback has been permanently blocked due to unauthorized modification of the app.</p>", "<p className=\"text-zinc-400\">Video playback has been permanently blocked due to unauthorized modification of the app.</p><p className=\"text-red-500 mt-4 text-xs\">{bunnyEmbedUrl}</p>")

with open(path_tsx, 'w', encoding='utf-8') as f:
    f.write(content)
print("page.tsx updated with debug UI")
