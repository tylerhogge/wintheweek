import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Win The Week — The CEO\'s Weekly Operating System',
    template: '%s · Win The Week',
  },
  description:
    'Send your team a single weekly email or Slack message. Collect replies. Get an AI-synthesized briefing on what your company accomplished and what you should do about it — without a meeting.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://wintheweek.co'),
  openGraph: {
    title: 'Win The Week — The CEO\'s Weekly Operating System',
    description: 'Send your team one weekly check-in. Get an AI intelligence briefing on what your company accomplished and what it needs from you.',
    url: 'https://wintheweek.co',
    siteName: 'Win The Week',
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Win The Week — The CEO\'s Weekly Operating System' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Win The Week — The CEO\'s Weekly Operating System',
    description: 'Send your team one weekly check-in. Get an AI intelligence briefing on what your company accomplished and what it needs from you.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>{children}<Analytics /></body>
    </html>
  )
}
