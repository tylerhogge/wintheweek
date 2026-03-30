'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { PreviewModal } from '@/components/settings/preview-modal'
import type { Campaign } from '@/types'

export default function SendTestEmail({
  campaigns,
  defaultEmail,
  defaultName,
}: {
  campaigns: Campaign[]
  defaultEmail: string
  defaultName: string
}) {
  const [open, setOpen] = useState(false)
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? '')
  const [email, setEmail] = useState(defaultEmail)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [previewOpen, setPreviewOpen] = useState(false)

  const selectedCampaign = campaigns.find((c) => c.id === campaignId) ?? campaigns[0]

  if (campaigns.length === 0) return null

  // Personalize preview body with first name
  const firstName = defaultName?.split(' ')[0] ?? 'Sarah'
  const previewBody = selectedCampaign?.body?.replace(/\{\{name\}\}/g, firstName) ?? ''
  const previewSubject = `[TEST] ${selectedCampaign?.subject ?? ''}`

  async function handleSend() {
    setSending(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, to_email: email, to_name: defaultName }),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-6 border border-white/[0.07] rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold tracking-tight">Send a test email</p>
          <p className="text-xs text-[#71717a] mt-0.5">Preview exactly what employees will receive</p>
        </div>
        <button
          onClick={() => { setOpen(!open); setStatus('idle') }}
          className="text-xs text-[#71717a] hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-md transition-colors"
        >
          {open ? 'Cancel' : 'Send test'}
        </button>
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-3">
          {campaigns.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Campaign</label>
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="w-full bg-[#111113] border border-white/10 text-white text-sm px-3.5 py-2.5 rounded-md outline-none focus:border-[#22c55e]/40 transition-colors"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Send to</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 bg-[#111113] border border-white/10 text-white text-sm px-3.5 py-2.5 rounded-md outline-none focus:border-[#22c55e]/40 placeholder-[#52525b] transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={sending || !email}
                className="bg-white text-black font-semibold text-sm px-4 py-2.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {sending ? 'Sending…' : 'Send now'}
              </button>
            </div>
          </div>

          <button
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-1.5 text-[11px] text-[#22c55e] hover:text-[#22c55e]/80 transition-colors"
          >
            <Eye className="w-3 h-3" /> See preview
          </button>

          {status === 'success' && (
            <p className="text-xs text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 px-3 py-2 rounded-md">
              ✓ Test email sent — check your inbox
            </p>
          )}
          {status === 'error' && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">
              Failed to send. Check your Resend setup.
            </p>
          )}
        </div>
      )}

      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Campaign email preview">
        <div className="bg-white rounded-lg p-6 text-[#111] text-sm leading-relaxed">
          <p className="font-medium text-xs text-[#a1a1aa] mb-4 uppercase tracking-wider">Subject: {previewSubject}</p>
          {previewBody.split('\n\n').map((para, i) => (
            <p key={i} className="mb-3" dangerouslySetInnerHTML={{ __html: para.replace(/\n/g, '<br/>') }} />
          ))}
        </div>
        <p className="text-[11px] text-[#52525b] mt-3">
          This is personalized with the recipient&apos;s first name. {'{{name}}'} becomes their name.
        </p>
      </PreviewModal>
    </div>
  )
}
