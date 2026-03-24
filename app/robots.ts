import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/dashboard', '/campaigns', '/team', '/trends', '/settings', '/onboarding'],
      },
    ],
    sitemap: 'https://wintheweek.co/sitemap.xml',
  }
}
