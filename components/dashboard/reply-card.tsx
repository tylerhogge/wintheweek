'use client'

import { useState } from 'react'
import { Bell, Trash2, ChevronDown, CheckCircle2 } from 'lucide-react'
import { getInitials, avatarGradient } from '@/lib/utils'
import type { SubmissionWithDetails, ManagerReply } from '@/types'

type Props = {
  submission: SubmissionWithDetails
  forceExpanded?: boolean
}

function statusLabel(status: string | undefined): string {
  switch (status) {
    case 'opened': return 'Opened'
    case 'delivered': return 'Delivered'
    case 'bounced': return 'Bounced'
    case 'complained': return 'Marked spam'
    default: return 'No reply yet'
  }
}

function statusStyle(status: string | undefined): string {
  switch (status) {
    case 'opened': return 'text-amber-400 border-amber-400/20 bg-amber-400/[0.06]'
    case 'delivered': return 'text-blue-400 border-blue-400/20 bg-blue-400/[0.06]'
    case 'bounced': return 'text-red-400 border-red-400/20 bg-red-400/[0.06]'
    case 'complained': return 'text-red-400 border-red-400/20 bg-red-400/[0.06]'
    default: return 'text-[#52525b] border-white/[0.06]'
  }
}

/** Get a short preview of the reply body (first ~120 chars, first line) */
function getPreview(body: string): string {
  const firstLine = body.split('\n').find(l => l.trim())?.trim() ?? ''
  if (firstLine.length <= 120) return firstLine
  return firstLine.slice(0, 117) + '…'
}

/** Relative time: "2h ago", "3d ago", etc. */
function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  // Fall back to short date
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ReplyCard({ submission, forceExpanded }: Props) {
  const { employee, response } = submission
  const hasReplied = !!response
  const managerReplies: ManagerReply[] = (response as any)?.manager_replies ?? []

  const [expanded, setExpanded] = useState(false)
  const isExpanded = forceExpanded || expanded

  const [nudgeSent, setNudgeSent] = useState(false)
  const [nudging, setNudging] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [nudgeFailed, setNudgeFailed] = useState(false)

  async function sendNudge() {
    if (nudging || nudgeSent) return
    setNudging(true)
    setNudgeFailed(false)
    try {
      const res = await fetch(`/api/submissions/${submission.id}/nudge`, { method: 'POST' })
      if (res.ok) {
        setNudgeSent(true)
      } else {
        setNudgeFailed(true)
      }
    } catch {
      setNudgeFailed(true)
    } finally {
      setNudging(false)
    }
  }

  async function hideCard() {
    setHidden(true)
    try {
      const url = response
        ? `/api/responses/${response.id}/hide`
        : `/api/submissions/${submission.id}/hide`
      const res = await fetch(url, { method: 'PATCH' })
      if (!res.ok) setHidden(false)
    } catch {
      setHidden(false)
    }
    setConfirming(false)
  }

  if (hidden) return null

  const preview = hasReplied && response.body_clean ? getPreview(response.body_clean) : null
  const threadCount = managerReplies.length

  return (
    <div className={`group bg-surface border rounded-xl transition-colors ${
      hasReplied ? 'border-white/[0.07] hover:border-white/[0.12]' : 'border-white/[0.04] opacity-50'
    }`}>

      {/* Clickable header row — always visible */}
      <div
        className={`flex items-center gap-3 px-5 py-3.5 ${hasReplied ? 'cursor-pointer select-none' : ''}`}
        onClick={hasReplied ? () => setExpanded(!expanded) : undefined}
      >
        {/* Green check for replied, avatar for pending */}
        {hasReplied ? (
          <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
        ) : (
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient(employee.email)} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
            {getInitials(employee.name)}
          </div>
        )}

        {/* Name + team + preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-semibold tracking-[-0.01em]">{employee.name}</span>
            {employee.team && (
              <span className="text-[10px] font-medium text-[#71717a] border border-white/[0.08] px-2 py-0.5 rounded-full bg-white/[0.03]">
                {employee.team}
              </span>
            )}
          </div>
          {/* Preview line when collapsed */}
          {hasReplied && !isExpanded && preview && (
            <p className="text-[12.5px] text-[#a1a1aa] mt-0.5 truncate">{preview}</p>
          )}
        </div>

        {/* Right side: status / time / actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!hasReplied && (
            <>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusStyle(submission.email_status)}`}>
                {statusLabel(submission.email_status)}
              </span>
              {submission.sent_at && (
                <span className="text-[11px] text-[#71717a]">
                  Sent {relativeTime(submission.sent_at)}
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); sendNudge() }}
                disabled={nudging || nudgeSent}
                aria-label="Send nudge reminder"
                className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all ${
                  nudgeSent
                    ? 'text-[#22c55e] border-[#22c55e]/30 bg-[#22c55e]/[0.06]'
                    : 'text-[#71717a] border-white/[0.08] hover:text-white hover:border-white/20'
                }`}
              >
                <Bell className="w-3 h-3" />
                {nudgeSent ? 'Nudged ✓' : nudgeFailed ? 'Failed' : nudging ? '...' : 'Nudge'}
              </button>
            </>
          )}

          {hasReplied && (
            <>
              {threadCount > 0 && (
                <span className="text-[10px] text-[#71717a]">
                  {threadCount} {threadCount === 1 ? 'reply' : 'replies'}
                </span>
              )}
              {submission.replied_at && (
                <span className="text-[11px] text-[#71717a]">
                  {relativeTime(submission.replied_at)}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 text-[#52525b] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </>
          )}

          {/* Delete button */}
          {confirming ? (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={hideCard}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Remove
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/[0.08] text-[#71717a] hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
              aria-label="Remove this submission"
              className="opacity-0 group-hover:opacity-100 text-[#52525b] hover:text-red-400 transition-all p-1 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded content — full reply body + conversation thread */}
      {hasReplied && isExpanded && (
        <div className="px-5 pb-4 pt-0">
          <div className="border-t border-white/[0.06] mb-3" />

          {response.body_clean && (
            <div className="flex items-start gap-3">
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGradient(employee.email)} flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5`}>
                {getInitials(employee.name)}
              </div>
              <p className="text-[13.5px] text-[#c4c4cc] leading-[1.65] whitespace-pre-wrap flex-1 min-w-0">
                {response.body_clean}
              </p>
            </div>
          )}

          {managerReplies.length > 0 && (
            <div className="mt-3 ml-5 sm:ml-10 flex flex-col gap-2.5">
              {managerReplies.map((mr: ManagerReply) => {
                const isEmployee = mr.sender_type === 'employee'
                return (
                  <div key={mr.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center self-stretch shrink-0" style={{ width: 20 }}>
                      <div className="w-px flex-1 bg-white/[0.06]" />
                    </div>
                    <div className="flex-1 min-w-0 rounded-lg px-3.5 py-2.5 bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] font-semibold uppercase tracking-[0.05em] ${
                          isEmployee ? 'text-accent/70' : 'text-[#71717a]'
                        }`}>
                          {isEmployee ? (mr.employee_name?.split(' ')[0] ?? 'Employee') : 'You replied'}
                        </span>
                        <span className="text-[11px] text-[#52525b]">
                          {relativeTime(mr.created_at)}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#a1a1aa] leading-[1.6] whitespace-pre-wrap">
                        {mr.body_clean}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
