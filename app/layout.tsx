import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'Win the Week',
    template: '%s · Win the Week',
  },
  description:
    'One email every Friday. Your whole team shares what they accomplished. You see it all in one place.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://wintheweek.co'),
  openGraph: {
    title: 'Win the Week',
    description: 'Weekly check-ins that actually work.',
    url: 'https://wintheweek.co',
    siteName: 'Win the Week',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Win the Week',
    description: 'Weekly check-ins that actually work.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}<Analytics /></body>
    </html>
  )
}
