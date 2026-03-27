import Link from 'next/link'
import { Logo } from '@/components/logo'

export const metadata = { title: 'Privacy Policy — Win The Week' }

const LAST_UPDATED = 'March 19, 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg text-[#fafafa]">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.07] bg-bg/85 backdrop-blur-xl">
        <div className="max-w-[1080px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight">
            <Logo size={26} />
            Win The Week
          </Link>
          <Link href="/auth/login" className="text-sm text-[#a1a1aa] hover:text-white px-3 py-1.5 border border-white/10 rounded-md transition-colors">
            Log in
          </Link>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="pt-32 pb-24">
        <div className="max-w-[640px] mx-auto px-6">

          <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-4">Privacy Policy</p>
          <h1 className="text-[36px] font-bold tracking-[-0.04em] leading-[1.1] mb-3">
            We keep it simple.
          </h1>
          <p className="text-sm text-[#52525b] mb-12">Last updated {LAST_UPDATED}</p>

          <div className="space-y-10 text-[#a1a1aa] text-[15px] leading-relaxed">

            <Section title="What we collect">
              <p>When you create an account, we collect your name and email address. When you add team members, we store their names and email addresses. When team members reply to check-in emails, we store the content of those replies.</p>
              <p>We also collect basic usage data (pages visited, actions taken) to understand how the product is being used and improve it over time.</p>
            </Section>

            <Section title="How we use it">
              <p>We use your information to operate Win The Week — sending check-in emails, displaying replies on your dashboard, and generating AI summaries of team updates. We do not sell your data. We do not share it with third parties except the service providers that help us run the product (email delivery, database hosting, AI processing).</p>
            </Section>

            <Section title="Email replies">
              <p>When your team members reply to check-in emails, those replies are stored and displayed on your dashboard. Team members are informed via their welcome email that their replies will be visible to their manager. Replies are not shared publicly or with anyone outside your organization.</p>
            </Section>

            <Section title="AI processing">
              <p>Win The Week uses AI to generate summaries and highlights from team replies. This processing happens via Anthropic's Claude API. Reply content is sent to Anthropic for this purpose. Anthropic's privacy policy applies to that processing.</p>
            </Section>

            <Section title="Data retention">
              <p>We retain your data for as long as your account is active. If you delete your account, we will delete your data within 30 days. You can request deletion at any time by emailing us.</p>
            </Section>

            <Section title="Cookies">
              <p>We use cookies only for authentication — to keep you logged in. We do not use tracking cookies or third-party advertising cookies.</p>
            </Section>

            <Section title="Your rights">
              <p>You can request access to, correction of, or deletion of your personal data at any time. Just email us at <a href="mailto:tyler@wintheweek.co" className="text-accent hover:underline">tyler@wintheweek.co</a>.</p>
            </Section>

            <Section title="Changes">
              <p>If we make meaningful changes to this policy, we'll update the date at the top and notify you by email. Continued use of Win The Week after changes take effect constitutes acceptance.</p>
            </Section>

            <Section title="Contact">
              <p>Questions? Email <a href="mailto:tyler@wintheweek.co" className="text-accent hover:underline">tyler@wintheweek.co</a>.</p>
            </Section>

          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.07] py-7 max-w-[1080px] mx-auto px-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight">
            <Logo size={26} />
            Win The Week
          </Link>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-sm text-[#a1a1aa] transition-colors">Privacy</Link>
            <Link href="/terms" className="text-sm text-[#71717a] hover:text-[#a1a1aa] transition-colors">Terms</Link>
            <Link href="/contact" className="text-sm text-[#71717a] hover:text-[#a1a1aa] transition-colors">Contact</Link>
          </div>
          <p className="text-xs text-[#52525b]">© 2026 Win The Week</p>
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
