import Link from 'next/link'

export const metadata = { title: 'Terms of Service — Win the Week' }

const LAST_UPDATED = 'March 19, 2026'

export default function TermsPage() {
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
            Win the Week
          </Link>
          <Link href="/auth/login" className="text-sm text-[#a1a1aa] hover:text-white px-3 py-1.5 border border-white/10 rounded-md transition-colors">
            Log in
          </Link>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="pt-32 pb-24">
        <div className="max-w-[640px] mx-auto px-6">

          <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-4">Terms of Service</p>
          <h1 className="text-[36px] font-bold tracking-[-0.04em] leading-[1.1] mb-3">
            Plain language. No surprises.
          </h1>
          <p className="text-sm text-[#52525b] mb-12">Last updated {LAST_UPDATED}</p>

          <div className="space-y-10 text-[#a1a1aa] text-[15px] leading-relaxed">

            <Section title="Who this applies to">
              <p>These terms apply to anyone who creates an account on Win the Week or uses the service ("you"). By using Win the Week, you agree to these terms.</p>
            </Section>

            <Section title="What Win the Week is">
              <p>Win the Week is a team alignment tool that sends weekly email check-ins to your team and collects their replies in a dashboard. You are responsible for the team members you add and the campaigns you send.</p>
            </Section>

            <Section title="Your account">
              <p>You are responsible for keeping your account credentials secure. You are responsible for all activity that occurs under your account. If you believe your account has been compromised, contact us immediately at <a href="mailto:hello@wintheweek.co" className="text-accent hover:underline">hello@wintheweek.co</a>.</p>
            </Section>

            <Section title="Your team members">
              <p>When you add team members to Win the Week, you are responsible for ensuring you have the right to send them emails on behalf of your organization. You must not add email addresses without the recipient's consent. We will honor any unsubscribe or opt-out request from a team member.</p>
            </Section>

            <Section title="Acceptable use">
              <p>You may not use Win the Week to send spam, harass individuals, violate applicable laws, or circumvent any limitations we impose. We reserve the right to suspend accounts that violate these terms.</p>
            </Section>

            <Section title="Subscription and billing">
              <p>Win the Week is currently free during beta. When paid plans launch, we will notify you in advance with pricing details. You will always have the option to continue or cancel before being charged.</p>
            </Section>

            <Section title="Your data">
              <p>You own your data. We process it on your behalf to operate the service. See our <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link> for details on how we handle it. You can export or delete your data at any time by contacting us.</p>
            </Section>

            <Section title="Availability">
              <p>We aim to keep Win the Week reliable, but we don't guarantee uptime. We may update, modify, or discontinue features at any time. If we ever decide to shut down the service, we will give you at least 30 days notice and help you export your data.</p>
            </Section>

            <Section title="Limitation of liability">
              <p>Win the Week is provided "as is." To the extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from your use of the service.</p>
            </Section>

            <Section title="Changes to these terms">
              <p>We may update these terms from time to time. We will notify you of meaningful changes by email. Continued use of Win the Week after changes take effect constitutes acceptance.</p>
            </Section>

            <Section title="Contact">
              <p>Questions about these terms? Email <a href="mailto:hello@wintheweek.co" className="text-accent hover:underline">hello@wintheweek.co</a>.</p>
            </Section>

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
            Win the Week
          </Link>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-sm text-[#71717a] hover:text-[#a1a1aa] transition-colors">Privacy</Link>
            <Link href="/terms" className="text-sm text-[#a1a1aa] transition-colors">Terms</Link>
            <Link href="/contact" className="text-sm text-[#71717a] hover:text-[#a1a1aa] transition-colors">Contact</Link>
          </div>
          <p className="text-xs text-[#52525b]">© 2026 Win the Week</p>
        </div>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-white text-base font-semibold mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
