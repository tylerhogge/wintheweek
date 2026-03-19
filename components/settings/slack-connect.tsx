'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  isConnected: boolean
  teamName?: string
  matchedCount: number
  totalCount: number
  orgId: string
}

export function SlackConnect({ isConnected, teamName, matchedCount, totalCount, orgId }: Props) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch('/api/slack/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ''}` },
        body: JSON.stringify({ org_id: orgId }),
      })
      router.refresh()
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Slack? Employees will receive check-ins via email instead.')) return
    setDisconnecting(true)
    try {
      await fetch('/api/slack/disconnect', { method: 'POST' })
      router.refresh()
    } finally {
      setDisconnecting(false)
    }
  }

  if (isConnected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-sm font-medium">Connected to <strong>{teamName}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-xs text-[#71717a] hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Re-sync users'}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        </div>
        <p className="text-xs text-[#71717a]">
          {matchedCount} of {totalCount} team member{totalCount !== 1 ? 's' : ''} matched to Slack
          {totalCount > matchedCount && (
            <span className="ml-1 text-[#52525b]">— unmatched members will receive email</span>
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-[#71717a]">Not connected</p>
      <a
        href="/api/slack/install"
        className="inline-flex items-center gap-2 text-sm font-semibold bg-[#4A154B] hover:bg-[#4A154B]/80 text-white px-4 py-2 rounded-md transition-colors"
      >
        <SlackIcon />
        Connect Slack
      </a>
    </div>
  )
}

function SlackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  )
}
