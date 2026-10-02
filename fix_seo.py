import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\layout.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = r'export const metadata: Metadata = \{.*?(?=export default function RootLayout)'
repl = """export const metadata: Metadata = {
  title: {
    template: '%s | Brilliant Academy',
    default: 'Brilliant Academy | Classes in Rakwana (Grade 6-11 & ICT)',
  },
  description: "Join Brilliant Academy Rakwana for the best Mathematics, Science, and ICT classes in Sri Lanka. Expert 
teaching for Grade 6-11 (O/L) and Advanced Level (A/L) ICT.",
  keywords: ["Rakwana class", "Classes in Rakwana", "Brilliant Academy Rakwana", "O/L Maths Rakwana", "O/L Science 
Rakwana", "ICT Classes Rakwana", "Grade 6-11 Tuition", "Sri Lanka Online Classes"],
  authors: [{ name: "Brilliant Academy" }],
  creator: "Brilliant Academy",
  openGraph: {
    type: "website",
    locale: "en_LK",
    url: "https://brillliantacademy.site/",
    title: "Brilliant Academy | Rakwana's Premier Educational Institute",
    description: "Master Maths, Science, and ICT with Brilliant Academy Rakwana. Join physical and online classes 
today.",
    siteName: "Brilliant Academy",
  },
};

"""

# Use re.DOTALL to match across newlines
content = re.sub(target, repl, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated SEO metadata in layout.tsx!")
