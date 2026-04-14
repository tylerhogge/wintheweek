'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { ReplyCard } from './reply-card'
import type { SubmissionWithDetails } from '@/types'

const DAY_LABEL: Record<number, string> = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday',
}

const TZ_LABELS: Record<string, string> = {
  'America/New_York': 'ET', 'America/Chicago': 'CT',
  'America/Denver': 'MT', 'America/Los_Angeles': 'PT',
  'America/Anchorage': 'AKT', 'Pacific/Honolulu': 'HT',
  'America/Phoenix': 'AZ',
}

function formatTime(time: string): string {
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr ?? '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:${m.slice(0, 2)} ${ampm}`
}

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
    if (scheduledCampaign && scheduledCampaign.employeeCount > 0) {
      const { sendDay, sendTime, timezone } = scheduledCampaign
      return (
        <div className="bg-surface border border-white/[0.07] rounded-xl p-6 text-center">
          <p className="text-[13px] text-[#a1a1aa] flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Sending {DAY_LABEL[sendDay]} at {formatTime(sendTime)} {TZ_LABELS[timezone] ?? timezone}
          </p>
        </div>
      )
    }

    return (
      <div className="bg-surface border border-white/[0.07] rounded-xl p-8 text-center">
        <p className="text-sm text-[#a1a1aa]">No {filter === 'replied' ? 'replies' : filter === 'pending' ? 'pending submissions' : 'submissions'} this week</p>
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
