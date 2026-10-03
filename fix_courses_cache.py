import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\courses\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update State Initializers for zero-latency cache
state_replacements = {
    'const [courses, setCourses] = useState<any[]>([]);': 
        'const [courses, setCourses] = useState<any[]>(() => { if(typeof window !== "undefined"){ const c = localStorage.getItem("cache_courses"); if(c) return JSON.parse(c); } return []; });',
    
    'const [teachers, setTeachers] = useState<any[]>([]);':
        'const [teachers, setTeachers] = useState<any[]>(() => { if(typeof window !== "undefined"){ const c = localStorage.getItem("cache_teachers"); if(c) return JSON.parse(c); } return []; });',
        
    'const [subjects, setSubjects] = useState<any[]>([]);':
        'const [subjects, setSubjects] = useState<any[]>(() => { if(typeof window !== "undefined"){ const c = localStorage.getItem("cache_subjects"); if(c) return JSON.parse(c); } return []; });',
        
    'const [loading, setLoading] = useState(true);':
        'const [loading, setLoading] = useState(() => { if(typeof window !== "undefined"){ return localStorage.getItem("cache_courses") ? false : true; } return true; });'
}

for old, new_st in state_replacements.items():
    content = content.replace(old, new_st)

# 2. Add localStorage.setItem to fetchCourses right before setCourses
cache_save_code = """
          // Save to Zero-Latency Cache
          localStorage.setItem("cache_courses", JSON.stringify(fetchedCourses));
          localStorage.setItem("cache_teachers", JSON.stringify(fetchedTeachers));
          localStorage.setItem("cache_subjects", JSON.stringify(fetchedSubjects));
          
          setCourses(fetchedCourses);
"""
# Replace the block where it calls setCourses
content = content.replace(
"""          setCourses(fetchedCourses);
          setTeachers(fetchedTeachers);
          setSubjects(fetchedSubjects);""", 
    cache_save_code + "\n          setTeachers(fetchedTeachers);\n          setSubjects(fetchedSubjects);"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Implemented SWR Memory Cache for Courses!")
