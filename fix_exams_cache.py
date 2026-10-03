import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\exams\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update State Initializers for zero-latency cache
state_replacements = {
    'const [exams, setExams] = useState<any[]>([]);': 
        'const [exams, setExams] = useState<any[]>(() => { if(typeof window !== "undefined"){ const c = localStorage.getItem("cache_exams"); if(c) return JSON.parse(c); } return []; });',
    
    'const [loading, setLoading] = useState(true);':
        'const [loading, setLoading] = useState(() => { if(typeof window !== "undefined"){ return localStorage.getItem("cache_exams") ? false : true; } return true; });'
}

for old, new_st in state_replacements.items():
    content = content.replace(old, new_st)

# 2. Add localStorage.setItem to fetchExams right before setExams
cache_save_code = """
          // Save to Zero-Latency Cache
          localStorage.setItem("cache_exams", JSON.stringify(fetchedExams));
          
          setExams(fetchedExams);
"""
# Replace the block where it calls setExams
content = content.replace(
    'setExams(fetchedExams);',
    cache_save_code
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Implemented SWR Memory Cache for Exams!")
