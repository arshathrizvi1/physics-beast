import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the entire Counter component
target_counter = r'const Counter = \(\{.*?return <span.*?</span>;\s*};'

repl_counter = """const Counter = ({ end, duration = 2, suffix = "" }: { end: number, duration?: number, suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView && ref.current) {
      let startTimestamp: number | null = null;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
        if (ref.current) {
          ref.current.innerText = Math.floor(progress * end) + suffix;
        }
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else if (ref.current) {
          ref.current.innerText = end + suffix;
        }
      };
      window.requestAnimationFrame(step);
    }
  }, [isInView, end, duration, suffix]);

  return <span ref={ref}>0{suffix}</span>;
};"""

content = re.sub(target_counter, repl_counter, content, flags=re.DOTALL)

# Add the Zoom API logic to the main Home component instead
target_home = r'export default function Home\(\) \{'
repl_home = """export default function Home() {
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
"""

if "fetch('/api/zoom/oauth'" not in content.split("export default function Home() {")[1]:
    content = content.replace(target_home, repl_home)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Optimized Counter Component!")
