import Link from 'next/link'

export const metadata = { title: 'Contact — Win The Week' }

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-bg text-[#fafafa]">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.07] bg-bg/85 backdrop-blur-xl">
        <div className="max-w-[1080px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight">
            <span className="w-[26px] h-[26px] bg-accent rounded-md flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            Win The Week
          </Link>
          <Link href="/auth/login" className="text-sm text-[#a1a1aa] hover:text-white px-3 py-1.5 border border-white/10 rounded-md transition-colors">
            Log in
          </Link>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="pt-32 pb-24">
        <div className="max-w-[560px] mx-auto px-6">

          <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-4">Contact</p>
          <h1 className="text-[36px] font-bold tracking-[-0.04em] leading-[1.1] mb-5">
            We read every email.
          </h1>
          <p className="text-[#a1a1aa] text-base leading-relaxed mb-12">
            Questions about the product, feedback on what's working (or isn't), ideas for features, or just want to talk through how to run this with your team — reach out directly.
          </p>

          {/* Email CTA */}
          <a
            href="mailto:tyler@wintheweek.co"
            className="inline-flex items-center gap-3 bg-surface border border-white/[0.09] hover:border-white/20 rounded-xl px-6 py-4 transition-colors group"
          >
            <span className="w-9 h-9 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold group-hover:text-white transition-colors">tyler@wintheweek.co</p>
              <p className="text-xs text-[#71717a]">We usually reply within a day</p>
            </div>
          </a>

          {/* Divider */}
          <div className="border-t border-white/[0.07] my-12" />

          {/* Specifics */}
          <div className="space-y-6">
            {[
              {
                label: 'Product support',
                desc: 'Having trouble with a campaign, replies not coming through, or something looks off on the dashboard — email us and we\'ll sort it.',
              },
              {
                label: 'Feature requests',
                desc: 'We\'re actively building. If there\'s something Win The Week doesn\'t do that would make it indispensable to you, we want to hear it.',
              },
              {
                label: 'Partnerships & press',
                desc: 'Interested in working together or writing about us — same email. Same human on the other end.',
              },
            ].map(({ label, desc }) => (
              <div key={label}>
                <p className="text-sm font-semibold mb-1">{label}</p>
                <p className="text-sm text-[#71717a] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.07] py-7 max-w-[1080px] mx-auto px-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight">
            <span className="w-[22px] h-[22px] bg-accent rounded-[5px] flex items-center justify-center shrink-0">
              <svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            Win The Week
          </Link>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-sm text-[#71717a] hover:text-[#a1a1aa] transition-colors">Privacy</Link>
            <Link href="/terms" className="text-sm text-[#71717a] hover:text-[#a1a1aa] transition-colors">Terms</Link>
            <Link href="/contact" className="text-sm text-[#a1a1aa] transition-colors">Contact</Link>
          </div>
          <p className="text-xs text-[#52525b]">© 2026 Win The Week</p>
        </div>
      </footer>
    </div>
  )
}
