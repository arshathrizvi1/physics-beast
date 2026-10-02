import re
import os

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\exams\page.tsx'
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    target = r'const fetchExams = async \(\) => \{'
    repl = """const fetchExams = async () => {
      // ULTRA LOW LATENCY CACHE (0ms load time)
      try {
        const cached = localStorage.getItem('cached_exams_page');
        if (cached) {
          const parsed = JSON.parse(cached);
          setExams(parsed.exams || []);
          setLoading(false); // Instantly remove the loading spinner!
        }
      } catch (e) {}
"""
    if "ULTRA LOW LATENCY CACHE" not in content:
        content = content.replace(target, repl)

    target_end = r'setExams\(fetchedExams\);'
    repl_end = """setExams(fetchedExams);
          
          // Save to local cache for 0ms instant loading next time!
          try {
            localStorage.setItem('cached_exams_page', JSON.stringify({
              exams: fetchedExams
            }));
          } catch(e) {}
"""
    if "Save to local cache" not in content:
        content = content.replace(target_end, repl_end)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected SWR caching for exams!")
else:
    print("exams/page.tsx not found")
