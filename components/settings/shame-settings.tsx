'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  slackConnected: boolean
  initialSlackEnabled: boolean
  initialChannelId: string | null
  initialChannelName: string | null
  initialEmailEnabled: boolean
}

export function ShameSettings({
  slackConnected,
  initialSlackEnabled,
  initialChannelId,
  initialChannelName,
  initialEmailEnabled,
}: Props) {
  const router = useRouter()
  const [slackEnabled, setSlackEnabled] = useState(initialSlackEnabled)
  const [channelId, setChannelId] = useState(initialChannelId ?? '')
  const [channelName, setChannelName] = useState(initialChannelName ?? '')
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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

        {/* Slack channel post */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">Post to Slack channel</p>
            <p className="text-xs text-[#71717a] mt-0.5">
              Every Monday morning, post who hasn&apos;t replied to a channel.
              {!slackConnected && (
                <span className="text-[#52525b]"> Connect Slack above first.</span>
              )}
            </p>
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

        {/* Divider between sub-options */}
        <div className="border-t border-white/[0.05]" />

        {/* Email report */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">Weekly email report</p>
            <p className="text-xs text-[#71717a] mt-0.5">
              Email you a list of non-respondents every Monday morning, regardless of Slack.
            </p>
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

    </div>
  )
}
