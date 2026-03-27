'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'
import { PreviewModal } from './preview-modal'

type Props = {
  slackConnected: boolean
  initialSlackEnabled: boolean
  initialChannelId: string | null
  initialChannelName: string | null
  initialEmailEnabled: boolean
  initialAutoNudge: boolean
}

export function ShameSettings({
  slackConnected,
  initialSlackEnabled,
  initialChannelId,
  initialChannelName,
  initialEmailEnabled,
  initialAutoNudge,
}: Props) {
  const router = useRouter()
  const [slackEnabled, setSlackEnabled] = useState(initialSlackEnabled)
  const [channelId, setChannelId] = useState(initialChannelId ?? '')
  const [channelName, setChannelName] = useState(initialChannelName ?? '')
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled)
  const [autoNudge, setAutoNudge] = useState(initialAutoNudge)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [previewNudge, setPreviewNudge] = useState(false)
  const [previewSlack, setPreviewSlack] = useState(false)
  const [previewEmail, setPreviewEmail] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/settings/shame', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shame_enabled: slackEnabled,
        shame_channel_id: channelId.trim() || null,
        shame_channel_name: channelName.trim() || null,
        shame_email_enabled: emailEnabled,
        auto_nudge: autoNudge,
      }),
    })
    setSaving(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-3">

      {/* Sub-options indented under the Wall of Shame header */}
      <div className="space-y-3 pl-4 border-l-2 border-white/[0.08]">

        {/* Auto-nudge — lightest weight, decide first */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">Auto-nudge</p>
            <p className="text-xs text-[#71717a] mt-0.5">
              Automatically nudge non-respondents ~48 hours before the Wall of Shame fires. A friendly reminder to reply.
            </p>
            <button onClick={() => setPreviewNudge(true)} className="flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 mt-1.5 transition-colors">
              <Eye className="w-3 h-3" /> See preview
            </button>
          </div>
          <button
            onClick={() => setAutoNudge(!autoNudge)}
            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
              autoNudge ? 'bg-accent' : 'bg-white/10'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                autoNudge ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.05]" />

        {/* Post to Slack channel */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">Post to Slack channel</p>
            <p className="text-xs text-[#71717a] mt-0.5">
              Every Monday morning, post who hasn&apos;t replied to a channel.
              {!slackConnected && (
                <span className="text-[#52525b]"> Connect Slack above first.</span>
              )}
            </p>
            <button onClick={() => setPreviewSlack(true)} className="flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 mt-1.5 transition-colors">
              <Eye className="w-3 h-3" /> See preview
            </button>
          </div>
          <button
            onClick={() => setSlackEnabled(!slackEnabled)}
            disabled={!slackConnected}
            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 disabled:opacity-40 ${
              slackEnabled && slackConnected ? 'bg-accent' : 'bg-white/10'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                slackEnabled && slackConnected ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Channel config — only shown when Slack toggle is on */}
        {slackEnabled && slackConnected && (
          <div className="space-y-2 pl-4 border-l-2 border-accent/20">
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1">
                Channel name <span className="text-[#52525b] font-normal">(e.g. general)</span>
              </label>
              <input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="general"
                className="w-full bg-surface2 border border-white/10 text-white text-sm px-3.5 py-2 rounded-md outline-none focus:border-accent/40 placeholder-[#52525b] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1">
                Channel ID <span className="text-[#52525b] font-normal">(starts with C)</span>
              </label>
              <input
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="C01234ABCDE"
                className="w-full bg-surface2 border border-white/10 text-white text-sm px-3.5 py-2 rounded-md outline-none focus:border-accent/40 placeholder-[#52525b] transition-colors font-mono"
              />
              <p className="text-xs text-[#52525b] mt-1">
                In Slack: right-click the channel → View channel details → copy the ID at the bottom.
              </p>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-white/[0.05]" />

        {/* Email report */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">Weekly email report</p>
            <p className="text-xs text-[#71717a] mt-0.5">
              Email you a list of non-respondents every Monday morning, regardless of Slack.
            </p>
            <button onClick={() => setPreviewEmail(true)} className="flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 mt-1.5 transition-colors">
              <Eye className="w-3 h-3" /> See preview
            </button>
          </div>
          <button
            onClick={() => setEmailEnabled(!emailEnabled)}
            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
              emailEnabled ? 'bg-accent' : 'bg-white/10'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                emailEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

      </div>

      {/* Save button */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-white text-black font-semibold text-sm px-4 py-2 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-xs text-accent">Saved</span>}
      </div>

      {/* ── Preview Modals ────────────────────────────────────────────── */}

      {/* Nudge preview */}
      <PreviewModal open={previewNudge} onClose={() => setPreviewNudge(false)} title="Nudge email preview">
        <div className="bg-white rounded-lg p-6 text-[#111] text-sm leading-relaxed">
          <p className="font-medium text-xs text-[#a1a1aa] mb-4 uppercase tracking-wider">Subject: Quick reminder — what did you win this week?</p>
          <p className="mb-3">Hey <span className="text-accent font-medium">Sarah</span>,</p>
          <p className="mb-3">Just a quick nudge — haven&apos;t heard from you yet this week. What did you get done?</p>
          <p className="mb-4">Hit reply and share whatever comes to mind — big wins, small progress, blockers. Takes 30 seconds.</p>
          <p className="text-[#52525b] text-[13px]">— Tyler</p>
          <div className="mt-6 pt-4 border-t border-[#e5e5e5] text-xs text-[#a1a1aa]">
            Sent via Win The Week
          </div>
        </div>
        <p className="text-[11px] text-[#52525b] mt-3">This is sent to each team member who hasn&apos;t replied, using their first name and your name as the sender.</p>
      </PreviewModal>

      {/* Slack post preview */}
      <PreviewModal open={previewSlack} onClose={() => setPreviewSlack(false)} title="Slack post preview">
        <div className="bg-[#1a1d21] rounded-lg p-5 text-sm">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 bg-accent rounded-[4px] flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[13px] font-bold text-white">Win The Week</span>
                <span className="text-[11px] text-[#616061] bg-[#616061]/10 px-1 rounded text-[10px]">APP</span>
              </div>
              <p className="text-[15px] text-[#d1d2d3] leading-relaxed mb-2">
                🚨 <strong>Weekly Update Wall of Shame</strong> — week of Mar 22 – 28, 2026
              </p>
              <p className="text-[15px] text-[#d1d2d3] leading-relaxed">
                The following <strong>3 of 9</strong> people haven&apos;t submitted yet:
              </p>
              <p className="text-[15px] text-[#d1d2d3] leading-relaxed mt-1.5">
                • Sarah Chen<br />
                • Marcus Rivera<br />
                • Priya Patel
              </p>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-[#52525b] mt-3">Posted to your configured Slack channel every Monday morning. Shows actual team member names.</p>
      </PreviewModal>

      {/* Email report preview */}
      <PreviewModal open={previewEmail} onClose={() => setPreviewEmail(false)} title="Weekly email report preview">
        <div className="bg-white rounded-lg p-6 text-[#111] text-sm leading-relaxed">
          <p className="font-medium text-xs text-[#a1a1aa] mb-4 uppercase tracking-wider">Subject: 🚨 3 non-respondents — Mar 22 – 28, 2026</p>
          <p className="mb-3">Hi <span className="text-accent font-medium">Tyler</span>,</p>
          <p className="mb-3">3 of 9 team members haven&apos;t replied to this week&apos;s check-in yet:</p>
          <div className="mb-3 pl-3">
            <p>• Sarah Chen</p>
            <p>• Marcus Rivera</p>
            <p>• Priya Patel</p>
          </div>
          <p className="mb-4">You can send individual nudges from the dashboard.</p>
          <p className="text-[#52525b] text-[13px]">—<br />Win The Week</p>
        </div>
        <p className="text-[11px] text-[#52525b] mt-3">Sent to your admin email every Monday morning. When everyone has replied, you&apos;ll get a congratulations email instead.</p>
      </PreviewModal>

    </div>
  )
}
