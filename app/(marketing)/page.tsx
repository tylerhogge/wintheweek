// Landing page — see /public/index.html for the static prototype
// This is the Next.js version of the same design

import Link from 'next/link'
import { WaitlistForm } from '@/components/marketing/waitlist-form'
import { DemoAnimation } from '@/components/marketing/demo-animation'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-[#fafafa]">
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.07] bg-bg/85 backdrop-blur-xl">
        <div className="max-w-[1080px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight">
            <span className="w-[26px] h-[26px] bg-accent rounded-md flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            Win the Week
          </Link>

          <ul className="hidden md:flex items-center gap-1">
            {[['#how', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing']].map(([href, label]: string[]) => (
              <li key={href}>
                <Link href={href} className="text-[#a1a1aa] hover:text-white text-sm px-3 py-1.5 rounded-md transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>

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

              <p className="text-[clamp(15px,1.8vw,17px)] text-[#a1a1aa] max-w-[440px] mb-10 leading-relaxed">
                Send your team a single weekly email (or Slack!). Collect replies. Get an instant view of what the whole company accomplished in an AI-synthesized summary — without a meeting, and without your team logging into anything.
              </p>

              <WaitlistForm />
              <p className="text-xs text-[#52525b] mt-3">Free during beta · No credit card required</p>
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
        <p className="text-base text-[#a1a1aa] mb-14 max-w-xl">Win the Week handles the sending, collecting, and summarizing. You just read the results.</p>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { n: '01', title: 'Configure your check-in', body: 'Customize the question, set your send schedule — Friday morning, every two weeks, whenever. Add your team in seconds.' },
            { n: '02', title: 'Employees just reply', body: 'They get a clean email. They hit Reply, type what they accomplished, and send. No app. No login. No friction whatsoever.' },
            { n: '03', title: 'You see everything', body: 'Replies land in your dashboard, organized by team. AI surfaces the highlights and trends so you don\'t have to dig.' },
          ].map(({ n, title, body }: { n: string; title: string; body: string }) => (
            <div key={n} className="bg-surface border border-white/[0.07] rounded-xl p-7 hover:border-white/[0.12] transition-colors">
              <div className="w-7 h-7 border border-white/10 rounded-md flex items-center justify-center text-xs font-semibold text-[#71717a] mb-5">{n}</div>
              <h3 className="text-[15px] font-semibold tracking-tight mb-2">{title}</h3>
              <p className="text-sm text-[#a1a1aa] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── POSITIONING ── */}
      <section className="py-16 max-w-[1080px] mx-auto px-6">
        <p className="text-center text-[clamp(20px,3vw,28px)] text-[#a1a1aa] leading-relaxed max-w-2xl mx-auto font-medium tracking-[-0.02em]">
          The CEO&apos;s operating system. Every week: what your company accomplished, and what it needs from you.
        </p>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 max-w-[1080px] mx-auto px-6">
        <p className="text-xs font-semibold tracking-[0.1em] uppercase text-accent mb-4">Features</p>
        <h2 className="text-[clamp(26px,4vw,38px)] font-bold tracking-[-0.03em] leading-[1.15] mb-14">Everything you need. Nothing you don&apos;t.</h2>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: '📬', title: 'Zero-friction replies', body: 'Employees reply directly to the email — or Slack. No app download, no login, no portal. Just hit Reply and type.' },
            { icon: '✦', title: 'AI weekly briefing', body: 'AI generates a highly contextual weekly briefing — not just on what your company is getting done, but what you should do as a CEO.' },
            { icon: '🏢', title: 'Team-level views', body: 'Filter by team or function to see what Engineering shipped vs. what Sales closed this week.' },
            { icon: '⚡', title: 'Full Slack integration', body: 'Run your company on Slack? No problem. Check-ins delivered as DMs, replies collected automatically — your team never leaves Slack.' },
            { icon: '🔔', title: 'Auto-nudges & accountability', body: 'Automatic reminders for people who haven\'t replied. You see who responded and who didn\'t — no awkward follow-ups needed.' },
            { icon: '💬', title: 'Ask your data anything', body: 'Email a question and get an AI-powered answer based on your team\'s check-in data. Like having a chief of staff on call.' },
          ].map(({ icon, title, body }: { icon: string; title: string; body: string }) => (
            <div key={title} className="bg-surface border border-white/[0.07] rounded-xl p-7 hover:border-white/[0.12] transition-colors">
              <div className="text-2xl mb-4">{icon}</div>
              <h3 className="text-[15px] font-semibold tracking-tight mb-2">{title}</h3>
              <p className="text-sm text-[#a1a1aa] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 max-w-[1080px] mx-auto px-6">
        <p className="text-xs font-semibold tracking-[0.1em] uppercase text-accent mb-4">Pricing</p>
        <h2 className="text-[clamp(26px,4vw,38px)] font-bold tracking-[-0.03em] leading-[1.15] mb-14">Dead simple. Massive value.</h2>

        <div className="grid md:grid-cols-4 gap-4">
          {[
            {
              name: 'Free', price: '$0', desc: 'Try it with your team', popular: false, cta: 'Get started',
              features: ['Up to 10 employees', '1 active campaign', 'Weekly reply dashboard', 'Reply tracking & nudges', '30-day history'],
            },
            {
              name: 'Growth', price: '$99', desc: 'For scaling companies', popular: true, cta: 'Join waitlist',
              features: ['Up to 100 employees', 'Unlimited campaigns', 'AI weekly intelligence briefing', 'Full Slack integration', 'Ask-your-data AI queries', 'Team & function filters', 'Unlimited history'],
            },
            {
              name: 'Premium', price: '$299', desc: 'For larger organizations', popular: false, cta: 'Join waitlist',
              features: ['Up to 250 employees', 'Everything in Growth', 'Custom send domain', 'Priority support', 'Dedicated onboarding'],
            },
            {
              name: 'Enterprise', price: 'Custom', desc: '250+ employees', popular: false, cta: 'Contact us',
              features: ['Unlimited employees', 'Everything in Premium', 'SSO & advanced security', 'Custom integrations', 'Dedicated account manager'],
            },
          ].map(({ name, price, desc, popular, features, cta }: { name: string; price: string; desc: string; popular: boolean; features: string[]; cta: string }) => (
            <div key={name} className={`bg-surface border rounded-xl p-7 ${popular ? 'border-accent/40 bg-gradient-to-b from-accent/[0.06] to-surface' : 'border-white/[0.07]'}`}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[13px] font-semibold">{name}</p>
                {popular && <span className="text-[10px] font-semibold bg-accent/10 text-accent border border-accent/30 px-2 py-0.5 rounded-full">Popular</span>}
              </div>
              <p className="text-xs text-[#71717a] mb-5">{desc}</p>
              <p className="mb-6"><span className="text-[36px] font-bold tracking-[-0.04em]">{price}</span>{price !== 'Custom' && <span className="text-sm text-[#71717a] ml-1">/ mo</span>}</p>
              <ul className="space-y-2.5 mb-6">
                {features.map((f: string) => (
                  <li key={f} className="text-sm text-[#a1a1aa] flex items-center gap-2">
                    <span className="text-accent font-bold text-xs">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href={name === 'Enterprise' ? '/contact' : '#waitlist'} className={`block text-center text-sm font-semibold py-2 rounded-md transition-colors ${popular ? 'bg-accent text-black hover:bg-accent/90' : 'border border-white/10 hover:bg-white/[0.04]'}`}>
                {cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.07] py-7 max-w-[1080px] mx-auto px-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight">
            <span className="w-[22px] h-[22px] bg-accent rounded-[5px] flex items-center justify-center shrink-0">
              <svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            Win the Week
          </Link>
          <div className="flex gap-5">
            {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Contact', '/contact']].map(([label, href]: string[]) => (
              <Link key={href} href={href} className="text-sm text-[#71717a] hover:text-[#a1a1aa] transition-colors">{label}</Link>
            ))}
          </div>
          <p className="text-xs text-[#52525b]">© 2026 Win the Week</p>
        </div>
      </footer>
    </div>
  )
}
