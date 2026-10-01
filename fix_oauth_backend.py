import sys
import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "const [count, setCount] = useState(0);"
replacement = """
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        fetch('/api/zoom/oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        }).then(res => res.json()).then(data => {
          if (data.success) {
            alert("Zoom Account Successfully Connected!");
          }
          window.history.replaceState({}, '', '/');
        }).catch(console.error);
      }
    }
  }, []);
  const [count, setCount] = useState(0);
"""

if "fetch('/api/zoom/oauth'" not in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched page.tsx")
