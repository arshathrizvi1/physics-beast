import re

with open('src/components/PremiumNavbar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. NAVBAR BACKGROUND & BORDER
content = re.sub(
    r'background: "rgba\(8,8,8,0\.82\)",\s*backdropFilter: "blur\(20px\)",\s*WebkitBackdropFilter: "blur\(20px\)",\s*borderBottom: "1px solid rgba\(212,175,55,0\.12\)",',
    '''background: "linear-gradient(105deg, #111111 0%, #2B2417 18%, #B08A32 42%, #51401D 50%, #222222 72%, #111111 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid #C9A227",''',
    content
)

# 2. LOGO text (keeping Brilliant in gold-ish but let's use the new palette)
content = content.replace('text-[#d4af37]', 'text-[#C9A227]')
content = content.replace('rgba(212,175,55', 'rgba(201,162,39') # converting old gold rgba to new gold

# 3. NAVIGATION TEXT
# Current: text-muted-foreground group-hover:text-foreground OR text-foreground
content = re.sub(
    r'className={elative z-10 text-xs lg:text-sm font-semibold tracking-wide transition-colors duration-300 \$\{active \? "[^"]+" : "[^"]+"}}',
    'className={elative z-10 text-xs lg:text-sm font-semibold tracking-wide transition-colors duration-200 }',
    content
)

# 4. ADMIN DASHBOARD BUTTON
content = re.sub(
    r'className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-\[#d4af37\]/10 hover:bg-\[#d4af37\]/20 border border-\[#d4af37\]/30 text-\[#d4af37\] font-semibold text-xs transition-all shadow-\[0_0_15px_rgba\(212,175,55,0\.1\)\]"',
    'className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs transition-all duration-200 hover:-translate-y-[1px]"\\n                    style={{ background: "linear-gradient(135deg, #E7C866, #C9A227, #F4E3A1)", color: "#171717", boxShadow: "0 4px 15px rgba(201,162,39,0.3)", border: "1px solid #F4E3A1" }}',
    content
)

# 5. SEARCH BUTTON
content = re.sub(
    r'className="hidden sm:flex items-center gap-3 px-4 py-1\.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 hover:border-white/20 transition-all text-xs"',
    'className="hidden sm:flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#1B1B1B]/80 border transition-all text-xs duration-200 hover:bg-[#242424]" style={{ borderColor: "rgba(231, 200, 102, 0.55)" }}',
    content
)
content = content.replace('<Search className="w-3.5 h-3.5" />', '<Search className="w-3.5 h-3.5 text-[#F4E3A1]" />')
content = content.replace('<span className="w-24 text-left">Search...</span>', '<span className="w-24 text-left text-[#F3F3F3]">Search...</span>')

# 6. AVATAR
content = re.sub(
    r'className="w-9 h-9 rounded-full border-2 border-\[#d4af37\]/40 overflow-hidden bg-secondary flex items-center justify-center shadow-\[0_0_12px_rgba\(212,175,55,0\.2\)\] hover:shadow-\[0_0_20px_rgba\(212,175,55,0\.4\)\] hover:border-\[#d4af37\]/70 transition-all cursor-pointer shrink-0"',
    'className="w-9 h-9 rounded-full border-2 border-[#D8D8D8] overflow-hidden flex items-center justify-center transition-all cursor-pointer shrink-0 duration-200 hover:border-[#F4E3A1]" style={{ background: "linear-gradient(135deg, #D8D8D8, #F4E3A1)" }}',
    content
)

# 7. LOGOUT BUTTON
content = re.sub(
    r'className="flex items-center justify-center gap-1\.5 bg-card border border-border hover:border-\[#d4af37\]/40 text-foreground/90 hover:text-foreground text-xs font-semibold w-9 h-9 sm:w-auto sm:px-3 sm:py-2 rounded-full transition-all"',
    'className="flex items-center justify-center gap-1.5 bg-[#1B1B1B] border border-[#C9A227] text-[#F4E3A1] hover:text-white hover:border-[#F4E3A1] text-xs font-semibold w-9 h-9 sm:w-auto sm:px-3 sm:py-2 rounded-full transition-all duration-200 hover:-translate-y-[1px]"',
    content
)

# 8. NOTIFICATION BELL (Usually it has its own component, but maybe it's here? Wait, it's <NotificationBell /> so we can leave it or pass props. The instructions said "Keep the existing icon and functionality. Use dark charcoal background with a subtle gold/silver border." If it's a separate component, I should modify that component too.)

with open('src/components/PremiumNavbar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
