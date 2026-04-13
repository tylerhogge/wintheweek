import Link from 'next/link'
import { Logo } from '@/components/logo'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight mb-8 justify-center">
          <Logo size={28} />
          Win The Week
        </Link>
        <p className="text-[64px] font-bold tracking-[-0.04em] text-white/20 mb-2">404</p>
        <h1 className="text-lg font-bold tracking-tight mb-2">Page not found</h1>
        <p className="text-sm text-[#a1a1aa] leading-relaxed mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-block text-sm font-semibold px-5 py-2.5 rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
