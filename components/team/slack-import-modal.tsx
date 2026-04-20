'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type SlackChannel = { id: string; name: string; num_members: number }

type Props = { onClose: () => void }

type Step = 'choose' | 'channels' | 'importing' | 'done'

export function SlackImportModal({ onClose }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('choose')
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set())
  const [channelSearch, setChannelSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ imported: number; new: number; existing: number } | null>(null)

  // Fetch channels when user picks "by channel"
  async function loadChannels() {
    setChannelsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/slack/channels')
      const data = await res.json()
      if (!res.ok) {
        if (data.error?.includes('missing_scope') || data.error?.includes('conversations.list')) {
          setError('Your Slack connection needs updated permissions. Please disconnect and reconnect Slack in Settings to enable channel import.')
        } else {
          setError(data.error ?? 'Failed to load channels')
        }
        return
      }
      setChannels(data.channels ?? [])
    } catch {
      setError('Failed to load channels')
    } finally {
      setChannelsLoading(false)
    }
  }

  function toggleChannel(id: string) {
    setSelectedChannels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllVisible() {
    const filtered = filteredChannels()
    setSelectedChannels((prev) => {
      const next = new Set(prev)
      filtered.forEach((ch) => next.add(ch.id))
      return next
    })
  }

  function deselectAll() {
    setSelectedChannels(new Set())
  }

  function filteredChannels(): SlackChannel[] {
    if (!channelSearch.trim()) return channels
    const q = channelSearch.toLowerCase()
    return channels.filter((ch) => ch.name.toLowerCase().includes(q))
  }

  async function doImport(mode: 'all' | 'channels') {
    setStep('importing')
    setError(null)
    try {
      const body: any = { mode }
      if (mode === 'channels') body.channel_ids = [...selectedChannels]

      const res = await fetch('/api/slack/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Import failed')
        setStep('choose')
        return
      }
      setResult({ imported: data.imported, new: data.new, existing: data.existing })
      setStep('done')
      router.refresh()
    } catch {
      setError('Import failed')
      setStep('choose')
    }
  }

  const filtered = filteredChannels()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#111113] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg max-sm:max-w-[95vw] mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#4A154B] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>
              </div>
              <h2 className="text-[17px] font-bold tracking-[-0.02em]">Import from Slack</h2>
            </div>
            <button onClick={onClose} className="text-[#52525b] hover:text-white transition-colors text-lg leading-none p-1">×</button>
          </div>
          <p className="text-xs text-[#71717a]">
            Pull your team directly from your connected Slack workspace
          </p>
        </div>

        <div className="px-6 py-5">
          {/* ── Step: Choose mode ─────────────────────────────────────── */}
          {step === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => doImport('all')}
                className="w-full text-left bg-[#09090b] border border-white/[0.08] hover:border-white/[0.18] rounded-xl px-5 py-4 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white mb-0.5">Import all employees</p>
                    <p className="text-xs text-[#71717a]">Every real user in your Slack workspace (bots and deactivated users are excluded)</p>
                  </div>
                  <span className="text-[#52525b] group-hover:text-white transition-colors text-lg">→</span>
                </div>
              </button>

              <button
                onClick={() => { setStep('channels'); loadChannels() }}
                className="w-full text-left bg-[#09090b] border border-white/[0.08] hover:border-white/[0.18] rounded-xl px-5 py-4 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white mb-0.5">Import by channel</p>
                    <p className="text-xs text-[#71717a]">Pick specific channels — members become employees with the channel as their team</p>
                  </div>
                  <span className="text-[#52525b] group-hover:text-white transition-colors text-lg">→</span>
                </div>
              </button>
            </div>
          )}

          {/* ── Step: Channel picker ─────────────────────────────────── */}
          {step === 'channels' && (
            <div>
              {channelsLoading ? (
                <div className="py-12 text-center">
                  <div className="inline-block w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
                  <p className="text-sm text-[#71717a]">Loading channels...</p>
                </div>
              ) : (
                <>
                  {/* Search + bulk actions */}
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      value={channelSearch}
                      onChange={(e) => setChannelSearch(e.target.value)}
                      placeholder="Search channels..."
                      className="flex-1 bg-[#09090b] border border-white/10 text-white text-sm px-3 py-2 rounded-md outline-none focus:border-accent/40 placeholder-[#3f3f46] transition-colors"
                    />
                    <button
                      onClick={selectedChannels.size > 0 ? deselectAll : selectAllVisible}
                      className="text-xs text-accent hover:text-accent/80 transition-colors shrink-0"
                    >
                      {selectedChannels.size > 0 ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>

                  {/* Channel list */}
                  <div className="bg-[#09090b] border border-white/[0.07] rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <p className="text-xs text-[#52525b] px-3 py-6 text-center">No channels found</p>
                    ) : (
                      filtered.map((ch) => (
                        <label
                          key={ch.id}
                          className={`flex items-center gap-3 px-3 py-2.5 border-b border-white/[0.04] last:border-0 cursor-pointer hover:bg-white/[0.02] transition-colors ${
                            selectedChannels.has(ch.id) ? 'bg-white/[0.03]' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedChannels.has(ch.id)}
                            onChange={() => toggleChannel(ch.id)}
                            className="w-3.5 h-3.5 rounded border-white/20 bg-transparent accent-accent shrink-0"
                          />
                          <span className="text-sm text-white font-medium">#{ch.name}</span>
                          <span className="text-xs text-[#52525b] ml-auto">{ch.num_members} members</span>
                        </label>
                      ))
                    )}
                  </div>

                  {selectedChannels.size > 0 && (
                    <p className="text-xs text-[#a1a1aa] mt-2">
                      {selectedChannels.size} channel{selectedChannels.size !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Step: Importing ──────────────────────────────────────── */}
          {step === 'importing' && (
            <div className="py-12 text-center">
              <div className="inline-block w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
              <p className="text-sm text-[#71717a]">Importing from Slack...</p>
              <p className="text-xs text-[#3f3f46] mt-1">This may take a moment for large workspaces</p>
            </div>
          )}

          {/* ── Step: Done ───────────────────────────────────────────── */}
          {step === 'done' && result && (
            <div className="py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white mb-1">
                {result.new > 0 ? `${result.new} new member${result.new !== 1 ? 's' : ''} imported` : 'Import complete'}
              </p>
              <p className="text-xs text-[#71717a]">
                {result.imported} total processed
                {result.existing > 0 && ` — ${result.existing} already existed`}
                {result.new > 0 && ' — welcome emails sent'}
              </p>
              <p className="text-xs text-[#52525b] mt-2">All imported users have Slack linked automatically</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 pb-3">
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 border-t border-white/[0.07] flex items-center justify-between">
          {step === 'channels' && !channelsLoading && (
            <button
              onClick={() => { setStep('choose'); setSelectedChannels(new Set()); setChannelSearch('') }}
              className="text-sm text-[#71717a] hover:text-white transition-colors"
            >
              ← Back
            </button>
          )}
          {step !== 'channels' && <div />}

          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-sm text-[#71717a] hover:text-white transition-colors">
              {step === 'done' ? 'Done' : 'Cancel'}
            </button>
            {step === 'channels' && !channelsLoading && (
              <button
                onClick={() => doImport('channels')}
                disabled={selectedChannels.size === 0}
                className="bg-white text-black font-semibold text-sm px-5 py-2.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                Import from {selectedChannels.size} channel{selectedChannels.size !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
