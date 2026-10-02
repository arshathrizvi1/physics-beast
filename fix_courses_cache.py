import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\courses\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = r'const fetchCourses = async \(\) => \{'

repl = """const fetchCourses = async () => {
      // ULTRA LOW LATENCY CACHE (0ms load time)
      try {
        const cached = localStorage.getItem('cached_courses_page');
        if (cached) {
          const parsed = JSON.parse(cached);
          setCourses(parsed.courses || []);
          setTeachers(parsed.teachers || []);
          setSubjects(parsed.subjects || []);
          setFolders(parsed.folders || []);
          setVideos(parsed.videos || []);
          setLoading(false); // Instantly remove the loading spinner!
        }
      } catch (e) {}
"""

if "ULTRA LOW LATENCY CACHE" not in content:
    content = content.replace(target, repl)

target_end = r'setCourses\(fetchedCourses\);'

repl_end = """setCourses(fetchedCourses);
          
          // Save to local cache for 0ms instant loading next time!
          try {
            localStorage.setItem('cached_courses_page', JSON.stringify({
              courses: fetchedCourses,
              teachers: fetchedTeachers,
              subjects: fetchedSubjects,
              folders: fetchedFolders,
              videos: fetchedVideos
            }));
          } catch(e) {}
"""

if "Save to local cache" not in content:
    content = content.replace(target_end, repl_end)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected SWR caching!")
