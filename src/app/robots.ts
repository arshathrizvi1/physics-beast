import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://brillliantacademy.site' 

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/course/', '/exam/', '/live/'], // Prevent Google from indexing paid areas
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
