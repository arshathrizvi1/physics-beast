import sys
import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\layout.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_metadata = '''export const metadata: Metadata = {
  title: "Brilliant Academy LMS",
  description: "Learn Today, Build Tomorrow",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Brilliant Academy LMS",
  },
  applicationName: "Brilliant Academy LMS",
};'''

new_metadata = '''export const metadata: Metadata = {
  title: {
    template: '%s | Brilliant Academy',
    default: 'Brilliant Academy | Advanced Level Physics & Online Classes Sri Lanka',
  },
  description: "Join Brilliant Academy for the best Advanced Level (A/L) Physics and Science online classes in Sri Lanka. Expert teachers, live sessions, and comprehensive study materials.",
  keywords: ["A/L Physics", "Online Classes Sri Lanka", "Brilliant Academy", "Advanced Level", "LMS", "Online Education", "Physics Tuition", "Sri Lanka"],
  authors: [{ name: "Brilliant Academy" }],
  creator: "Brilliant Academy",
  openGraph: {
    type: "website",
    locale: "en_LK",
    url: "https://brilliantacademy.vercel.app/",
    title: "Brilliant Academy | Premium Online A/L Classes",
    description: "Master Advanced Level Physics with Sri Lanka's leading online educational platform. Join thousands of students today.",
    siteName: "Brilliant Academy",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Brilliant Academy LMS",
  },
  applicationName: "Brilliant Academy LMS",
};'''

content = content.replace(old_metadata, new_metadata)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

sitemap = """import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://brilliantacademy.vercel.app' // Replace with your custom domain later
  
  return [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/courses`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
"""
with open(r'C:\Projects\Brilliant Academy\physics-beast\src\app\sitemap.ts', 'w', encoding='utf-8') as f:
    f.write(sitemap)

robots = """import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://brilliantacademy.vercel.app' // Replace with your custom domain later

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/course/', '/exam/', '/live/'], // Prevent Google from indexing paid areas
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
"""
with open(r'C:\Projects\Brilliant Academy\physics-beast\src\app\robots.ts', 'w', encoding='utf-8') as f:
    f.write(robots)

print("SEO tags, sitemap, and robots created!")
