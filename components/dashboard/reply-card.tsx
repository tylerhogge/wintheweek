'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { getInitials, avatarGradient } from '@/lib/utils'
import type { SubmissionWithDetails } from '@/types'

type Props = { submission: SubmissionWithDetails }

export function ReplyCard({ submission }: Props) {
  const { employee, response } = submission
  const hasReplied = !!response

  const [liked, setLiked] = useState(!!(response as any)?.liked_at)
  const [loading, setLoading] = useState(false)

  async function toggleLike() {
    if (!response || loading) return
    setLoading(true)
    setLiked((prev) => !prev) // optimistic update
    try {
      const res = await fetch(`/api/responses/${response.id}/like`, { method: 'POST' })
      if (!res.ok) setLiked((prev) => !prev) // revert on error
    } catch {
      setLiked((prev) => !prev)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`bg-surface border rounded-xl px-5 py-4 flex items-start gap-4 transition-colors ${
      hasReplied ? 'border-white/[0.07] hover:border-white/[0.12]' : 'border-white/[0.04] opacity-50'
    }`}>

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
            <span className="text-[10px] font-medium text-[#52525b] border border-white/[0.06] px-2 py-0.5 rounded-full ml-auto">
              No reply yet
            </span>
          )}
          {hasReplied && submission.replied_at && (
            <span className="text-[11px] text-[#52525b] ml-auto">
              {new Date(submission.replied_at).toLocaleString('en-US', {
                weekday: 'short', hour: 'numeric', minute: '2-digit',
              })}
            </span>
          )}
        </div>

        {/* Reply body */}
        {hasReplied && response.body_clean && (
          <p className="text-[13.5px] text-[#a1a1aa] leading-[1.65] whitespace-pre-wrap">
            {response.body_clean}
          </p>
        )}
      </div>

      {/* Like button — only shown when there is a reply */}
      {hasReplied && (
        <button
          onClick={toggleLike}
          disabled={loading}
          aria-label={liked ? 'Unlike' : 'Like this reply'}
          className={`shrink-0 mt-0.5 flex items-center gap-1 rounded-md px-2 py-1.5 transition-all ${
            liked
              ? 'text-rose-400 bg-rose-500/[0.1] border border-rose-500/20'
              : 'text-[#52525b] hover:text-rose-400 border border-transparent hover:border-rose-500/20 hover:bg-rose-500/[0.06]'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 transition-all ${liked ? 'fill-rose-400' : ''}`} />
        </button>
      )}
    </div>
  )
}
