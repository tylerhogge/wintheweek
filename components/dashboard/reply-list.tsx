'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ReplyCard } from './reply-card'
import type { SubmissionWithDetails } from '@/types'

type ScheduledCampaign = {
  employeeCount: number
  sendDay: number
  sendTime: string
  timezone: string
  campaignId: string
} | null

type Props = {
  replied: SubmissionWithDetails[]
  pending: SubmissionWithDetails[]
  unsent?: SubmissionWithDetails[]
  filter?: string
  scheduledCampaign?: ScheduledCampaign
  replyHistory?: Record<string, { replied: number; sent: number; streak: number }>
}

export function ReplyList({ replied, pending, unsent = [], filter, scheduledCampaign, replyHistory = {} }: Props) {
  const [expandAll, setExpandAll] = useState(false)

  // Determine what to show based on filter
  const showReplied = filter !== 'pending'
  const showPending = filter !== 'replied'

  const hasReplied = replied.length > 0
  const hasPending = pending.length > 0
  const total = replied.length + pending.length

  if (total === 0) {
    return (
      <div className="bg-surface border border-white/[0.07] rounded-xl p-8 text-center">
        <p className="text-sm text-[#a1a1aa]">
          {filter === 'replied' ? 'No replies yet' : filter === 'pending' ? 'No pending submissions' : 'Replies will appear here as your team responds'}
        </p>
        {!filter && (
          <p className="text-xs text-[#52525b] mt-1.5">Your CEO briefing gets created once 50% of the team has replied</p>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Expand all toggle — only show when there are replies */}
      {hasReplied && showReplied && (
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setExpandAll(!expandAll)}
            className="flex items-center gap-1 text-[11px] font-medium text-[#71717a] hover:text-white transition-colors"
          >
            {expandAll ? (
              <>Collapse all <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Expand all <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {/* Replied cards first */}
        {showReplied && replied.map((submission) => (
          <ReplyCard key={submission.id} submission={submission} forceExpanded={expandAll} replyHistory={replyHistory[(submission as any).employee?.id]} />
        ))}

        {/* Divider between replied and pending */}
        {showReplied && showPending && hasReplied && hasPending && (
          <div className="flex items-center gap-3 my-1 px-1">
            <div className="flex-1 border-t border-white/[0.06]" />
            <span className="text-[11px] text-[#a1a1aa] font-medium shrink-0">
              Waiting on {pending.length} {pending.length === 1 ? 'reply' : 'replies'}
            </span>
            <div className="flex-1 border-t border-white/[0.06]" />
          </div>
        )}

        {/* Pending cards */}
        {showPending && pending.map((submission) => (
          <ReplyCard key={submission.id} submission={submission} replyHistory={replyHistory[(submission as any).employee?.id]} />
        ))}

        {/* Unsent cards — failed or still queued */}
        {showPending && unsent.length > 0 && (
          <>
            <div className="flex items-center gap-3 my-1 px-1">
              <div className="flex-1 border-t border-[#f59e0b]/20" />
              <span className="text-[11px] text-[#f59e0b] font-medium shrink-0">
                {unsent.length} not sent
              </span>
              <div className="flex-1 border-t border-[#f59e0b]/20" />
            </div>
            {unsent.map((submission) => (
              <ReplyCard key={submission.id} submission={submission} replyHistory={replyHistory[(submission as any).employee?.id]} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
