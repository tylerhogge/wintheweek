// Landing page — see /public/index.html for the static prototype
// This is the Next.js version of the same design

import Link from 'next/link'
import { WaitlistForm } from '@/components/marketing/waitlist-form'
import { DemoAnimation } from '@/components/marketing/demo-animation'
import { ScrollNav } from '@/components/marketing/scroll-nav'
import { Logo } from '@/components/logo'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-[#fafafa]">
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.07] bg-bg/85 backdrop-blur-xl">
        <div className="max-w-[1080px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight">
            <Logo size={26} />
            Win The Week
          </Link>

          <ScrollNav />

          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="text-sm text-[#a1a1aa] hover:text-white px-3 py-1.5 border border-white/10 rounded-md transition-colors">
              Log in
            </Link>
            <Link href="#waitlist" className="text-sm font-semibold bg-white text-black px-4 py-1.5 rounded-md hover:bg-white/90 transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO + DEMO ── */}
      <section className="pt-28 pb-20 relative overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[600px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.07)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-[1160px] mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-1.5 bg-accent/10 border border-accent/25 text-accent text-xs font-medium px-3 py-1 rounded-full mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Now in beta — join the waitlist
              </div>

              <h1 className="text-[clamp(32px,4.5vw,54px)] font-bold tracking-[-0.04em] leading-[1.08] mb-5">
                What did your company get done <em className="not-italic text-accent">this week?</em>
              </h1>

              <p className="text-[clamp(15px,1.8vw,17px)] text-[#d4d4d8] max-w-[440px] mb-10 leading-relaxed">
                Send your team one weekly email (or Slack!). Collect replies. Get an AI-synthesized CEO briefing on what the whole company accomplished — no meetings, no logins.
              </p>

              <WaitlistForm />
              <p className="text-xs text-[#52525b] mt-3">First month free · No credit card required</p>
            </div>

            {/* Right: animation */}
            <div>
              <DemoAnimation />
            </div>

          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-24 max-w-[1080px] mx-auto px-6">
        <p className="text-xs font-semibold tracking-[0.1em] uppercase text-accent mb-4">How it works</p>
        <h2 className="text-[clamp(26px,4vw,38px)] font-bold tracking-[-0.03em] leading-[1.15] mb-4">Set it once. Runs every week.</h2>
        <p className="text-base text-[#a1a1aa] mb-14 max-w-xl">Win The Week handles the sending, collecting, and summarizing. You just read the results.</p>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { n: '01', title: 'Configure your check-in', body: 'Add your team, set your CEO priorities, and choose your send schedule. Takes two minutes.' },
            { n: '02', title: 'Employees just reply', body: 'They get a clean email or Slack DM. They hit Reply, type what they accomplished, and send. No app. No login. No friction.' },
            { n: '03', title: 'Get your CEO briefing', body: 'Every Monday, get an AI-powered briefing — what moved, what stalled, who delivered, and how it maps to your priorities.' },
          ].map(({ n, title, body }: { n: string; title: string; body: string }) => (
            <div key={n} className="bg-surface border border-white/[0.07] rounded-xl p-7 hover:border-white/[0.12] transition-colors">
              <div className="w-7 h-7 border border-white/10 rounded-md flex items-center justify-center text-xs font-semibold text-[#71717a] mb-5">{n}</div>
              <h3 className="text-[15px] font-semibold tracking-tight mb-2">{title}</h3>
              <p className="text-sm text-[#a1a1aa] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 max-w-[1080px] mx-auto px-6">
        <p className="text-xs font-semibold tracking-[0.1em] uppercase text-accent mb-4">Features</p>
        <h2 className="text-[clamp(26px,4vw,38px)] font-bold tracking-[-0.03em] leading-[1.15] mb-14">Everything you need. Nothing you don&apos;t.</h2>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: '📬', title: 'Zero-friction check-ins', body: 'Employees reply directly to the email — or Slack. No app download, no login, no portal. Just hit Reply and type.' },
            { icon: '✦', iconClass: 'text-3xl', title: 'AI CEO briefing', body: 'AI synthesizes every check-in into a CEO briefing with company sentiment scoring, top themes, and risk flags. Know how your team is feeling — not just what they\'re doing.' },
            { icon: 'slack', title: 'Slack integration', body: 'Run your company on Slack? No problem. Check-ins delivered as DMs, replies collected automatically — your team never leaves Slack.' },
            { icon: '🔔', title: 'Auto-nudges & accountability', body: 'Automatic reminders for people who haven\'t replied. See who responded and who didn\'t — no awkward follow-ups.' },
            { icon: '💬', title: 'Ask your data anything', body: 'Email a question and get an AI-powered answer based on your team\'s check-in data. Like having a chief of staff on call.' },
            { icon: '📊', title: 'Sentiment & trends over time', body: 'Track company mood, top themes, and reply rates week over week. AI scores team sentiment from check-in tone — spot morale dips early.' },
          ].map(({ icon, iconClass, title, body }: { icon: string; iconClass?: string; title: string; body: string }) => (
            <div key={title} className="bg-surface border border-white/[0.07] rounded-xl p-7 hover:border-white/[0.12] transition-colors h-full">
              <div className={`${iconClass ?? 'text-2xl'} mb-4 w-8 h-8 flex items-center justify-center`}>
                {icon === 'slack' ? (
                  <svg width="24" height="24" viewBox="0 0 127 127" xmlns="http://www.w3.org/2000/svg">
                    <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" fill="#E01E5A"/>
                    <path d="M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2H47z" fill="#36C5F0"/>
                    <path d="M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.8C66.9 6.5 72.8.6 80.1.6c7.3 0 13.2 5.9 13.2 13.2v33.1z" fill="#2EB67D"/>
                    <path d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z" fill="#ECB22E"/>
                  </svg>
                ) : icon}
              </div>
              <h3 className="text-[15px] font-semibold tracking-tight mb-2">{title}</h3>
              <p className="text-sm text-[#a1a1aa] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 max-w-[1080px] mx-auto px-6">
        <p className="text-xs font-semibold tracking-[0.1em] uppercase text-accent mb-4">Pricing</p>
        <h2 className="text-[clamp(26px,4vw,38px)] font-bold tracking-[-0.03em] leading-[1.15] mb-4">Dead simple. Massive value.</h2>
        <p className="text-[#a1a1aa] text-sm mb-14">First month free to get your rhythm. No credit card required to start.</p>

        <div className="grid sm:grid-cols-3 gap-4 max-w-[920px] mx-auto">
          {/* Pro */}
          <div className="bg-surface border border-white/[0.07] rounded-xl p-7 flex flex-col">
            <p className="text-[13px] font-semibold mb-1">Pro</p>
            <p className="text-xs text-[#71717a] mb-5">Up to 100 employees</p>
            <p className="mb-1"><span className="text-[36px] font-bold tracking-[-0.04em]">$199</span><span className="text-sm text-[#71717a] ml-1">/ mo</span></p>
            <p className="text-xs text-accent mb-6">First month free</p>
            <ul className="space-y-2.5 mb-6 flex-1">
              {['Unlimited campaigns', 'AI weekly CEO briefing', 'Company sentiment & themes', 'Slack integration', 'Ask-your-data AI queries', 'Team & function filters', 'Reply tracking & auto-nudges', 'Unlimited history'].map((f: string) => (
                <li key={f} className="text-sm text-[#a1a1aa] flex items-center gap-2">
                  <span className="text-accent font-bold text-xs">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="#waitlist" className="block text-center text-sm font-semibold py-2 rounded-md transition-colors border border-white/10 hover:bg-white/[0.04]">
              Get started free
            </Link>
          </div>

          {/* Growth */}
          <div className="bg-surface border border-accent/40 bg-gradient-to-b from-accent/[0.06] to-surface rounded-xl p-7 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[13px] font-semibold">Growth</p>
              <span className="text-[10px] font-semibold bg-accent/10 text-accent border border-accent/30 px-2 py-0.5 rounded-full">Popular</span>
            </div>
            <p className="text-xs text-[#71717a] mb-5">Up to 500 employees</p>
            <p className="mb-1"><span className="text-[36px] font-bold tracking-[-0.04em]">$399</span><span className="text-sm text-[#71717a] ml-1">/ mo</span></p>
            <p className="text-xs text-accent mb-6">First month free</p>
            <ul className="space-y-2.5 mb-6 flex-1">
              {['Everything in Pro', 'Custom send domain', 'Priority support', 'Dedicated onboarding', 'Advanced analytics'].map((f: string) => (
                <li key={f} className="text-sm text-[#a1a1aa] flex items-center gap-2">
                  <span className="text-accent font-bold text-xs">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="#waitlist" className="block text-center text-sm font-semibold py-2 rounded-md transition-colors bg-accent text-black hover:bg-accent/90">
              Get started free
            </Link>
          </div>

          {/* Enterprise */}
          <div className="bg-surface border border-white/[0.07] rounded-xl p-7 flex flex-col">
            <p className="text-[13px] font-semibold mb-1">Enterprise</p>
            <p className="text-xs text-[#71717a] mb-5">500+ employees</p>
            <p className="mb-6"><span className="text-[36px] font-bold tracking-[-0.04em]">Let&apos;s talk</span></p>
            <ul className="space-y-2.5 mb-6 flex-1">
              {['Everything in Growth', 'SSO & advanced security', 'Custom integrations', 'Dedicated account manager', 'SLA & uptime guarantee'].map((f: string) => (
                <li key={f} className="text-sm text-[#a1a1aa] flex items-center gap-2">
                  <span className="text-accent font-bold text-xs">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/contact" className="block text-center text-sm font-semibold py-2 rounded-md transition-colors border border-white/10 hover:bg-white/[0.04]">
              Contact us
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.07] py-7 max-w-[1080px] mx-auto px-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight">
            <Logo size={22} />
            Win The Week
          </Link>
          <div className="flex gap-5">
            {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Contact', '/contact']].map(([label, href]: string[]) => (
              <Link key={href} href={href} className="text-sm text-[#71717a] hover:text-[#a1a1aa] transition-colors">{label}</Link>
            ))}
          </div>
          <p className="text-xs text-[#52525b]">© 2026 Win The Week</p>
        </div>
      </footer>
    </div>
  )
}
