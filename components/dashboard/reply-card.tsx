'use client'

import { useState } from 'react'
import { Bell, Trash2 } from 'lucide-react'
import { getInitials, avatarGradient } from '@/lib/utils'
import type { SubmissionWithDetails, ManagerReply } from '@/types'

type Props = { submission: SubmissionWithDetails }

export function ReplyCard({ submission }: Props) {
  const { employee, response } = submission
  const hasReplied = !!response
  const managerReplies: ManagerReply[] = (response as any)?.manager_replies ?? []

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

  async function hideResponse() {
    if (!response) return
    setHidden(true)
    try {
      const res = await fetch(`/api/responses/${response.id}/hide`, { method: 'PATCH' })
      if (!res.ok) setHidden(false)
    } catch {
      setHidden(false)
    }
    setConfirming(false)
  }

  if (hidden) return null

  return (
    <div className={`group bg-surface border rounded-xl px-5 py-4 transition-colors ${
      hasReplied ? 'border-white/[0.07] hover:border-white/[0.12]' : 'border-white/[0.04] opacity-50'
    }`}>

      {/* Employee reply row */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient(employee.email)} flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5`}>
          {getInitials(employee.name)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-[13.5px] font-semibold tracking-[-0.01em]">{employee.name}</span>
            {employee.team && (
              <span className="text-[10px] font-medium text-[#71717a] border border-white/[0.08] px-2 py-0.5 rounded-full bg-white/[0.03]">
                {employee.team}
              </span>
            )}
            {!hasReplied && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] font-medium text-[#52525b] border border-white/[0.06] px-2 py-0.5 rounded-full">
                  No reply yet
                </span>
                <button
                  onClick={sendNudge}
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
              </div>
            )}
            {hasReplied && (
              <div className="ml-auto flex items-center gap-2">
                {submission.replied_at && (
                  <span className="text-[11px] text-[#52525b]">
                    {new Date(submission.replied_at).toLocaleString('en-US', {
                      weekday: 'short', hour: 'numeric', minute: '2-digit',
                    })}
                  </span>
                )}
                {/* Delete button — visible on hover or when confirming */}
                {confirming ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={hideResponse}
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
                    onClick={() => setConfirming(true)}
                    aria-label="Remove this response"
                    className="opacity-0 group-hover:opacity-100 text-[#52525b] hover:text-red-400 transition-all p-1 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Reply body */}
          {hasReplied && response.body_clean && (
            <p className="text-[13.5px] text-[#a1a1aa] leading-[1.65] whitespace-pre-wrap">
              {response.body_clean}
            </p>
          )}
        </div>
      </div>

      {/* Conversation thread (CEO replies + employee follow-ups) */}
      {managerReplies.length > 0 && (
        <div className="mt-3 ml-6 sm:ml-12 flex flex-col gap-2.5">
          {managerReplies.map((mr: ManagerReply) => {
            const isEmployee = mr.sender_type === 'employee'
            return (
              <div key={mr.id} className="flex items-start gap-3">
                {/* Connector line */}
                <div className="flex flex-col items-center self-stretch shrink-0" style={{ width: 20 }}>
                  <div className="w-px flex-1 bg-white/[0.06]" />
                </div>
                <div className={`flex-1 min-w-0 rounded-lg px-3.5 py-2.5 ${
                  isEmployee
                    ? 'bg-white/[0.02] border border-white/[0.06]'
                    : 'bg-white/[0.02] border border-white/[0.06]'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[11px] font-semibold uppercase tracking-[0.05em] ${
                      isEmployee ? 'text-accent/70' : 'text-[#71717a]'
                    }`}>
                      {isEmployee ? (mr.employee_name?.split(' ')[0] ?? 'Employee') : 'You replied'}
                    </span>
                    <span className="text-[11px] text-[#3f3f46]">
                      {new Date(mr.created_at).toLocaleString('en-US', {
                        weekday: 'short', hour: 'numeric', minute: '2-digit',
                      })}
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
  )
}
