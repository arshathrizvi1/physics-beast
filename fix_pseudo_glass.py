import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the Search Bar container pseudo-glass
content = content.replace(
    'bg-white dark:bg-secondary border border-black/10 dark:border-zinc-700',
    'bg-white/70 dark:bg-zinc-900/70 border border-black/5 dark:border-white/10 shadow-xl'
)

# 2. Update the "Start Your Learning Journey" button
content = content.replace(
    'className="bg-white text-black hover:bg-zinc-200 rounded-full',
    'className="bg-white/80 dark:bg-white/90 border border-black/5 dark:border-white/20 shadow-xl text-black hover:bg-white rounded-full'
)

# 3. Update the floating glass cards (if any)
content = content.replace(
    'bg-card border border-[#d4af37]/30',
    'bg-card/70 border border-[#d4af37]/30 shadow-2xl'
)

# 4. Update the "Live Study Sessions" and "2026/27 A/L" badge backgrounds
content = content.replace(
    'bg-black/75 px-3 py-1.5',
    'bg-black/50 border-white/20 shadow-lg px-3 py-1.5'
)
content = content.replace(
    'bg-zinc-950/70',
    'bg-black/50 border border-white/10 shadow-lg'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected High-Performance Pseudo-Glass!")
