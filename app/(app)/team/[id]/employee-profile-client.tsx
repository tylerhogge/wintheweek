'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import type { Employee } from '@/types'
import { getInitials, avatarGradient } from '@/lib/utils'
import { ArrowLeft, Clock } from 'lucide-react'

type ProfileSubmission = {
  id: string
  week_start: string
  sent_at: string | null
  replied_at: string | null
  nudged_at: string | null
  email_status: string
  hidden_at: string | null
  response: {
    id: string
    body_clean: string | null
    created_at: string
    manager_replies: { id: string; body_clean: string; sender_type: string; employee_name: string | null; created_at: string }[]
  } | null
}

type Props = {
  employee: Employee
  submissions: ProfileSubmission[]
  stats: {
    totalSent: number
    totalReplied: number
    replyRate: number
    currentStreak: number
    avgResponseTimeHrs: number | null
  }
  orgName: string
}

export function EmployeeProfileClient({ employee, submissions, stats, orgName }: Props) {
  const [insights, setInsights] = useState<string | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/team/${employee.id}/insights`)
      .then(r => r.json())
      .then(data => setInsights(data.insights))
      .catch(() => setInsights('Unable to generate insights at this time.'))
      .finally(() => setInsightsLoading(false))
  }, [employee.id])

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/team"
        className="inline-flex items-center gap-1.5 text-sm text-[#71717a] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Team
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${avatarGradient(employee.email)} flex items-center justify-center text-base font-bold text-white shrink-0`}>
          {getInitials(employee.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-white mb-2">{employee.name}</h1>
          <p className="text-sm text-[#71717a] mb-3">{employee.email}</p>
          <div className="flex flex-wrap gap-2">
            {employee.team && (
              <span className="text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full">
                {employee.team}
              </span>
            )}
            {employee.function && (
              <span className="text-xs font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-full">
                {employee.function}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className={`grid gap-3 ${stats.avgResponseTimeHrs !== null ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <div className="bg-surface border border-white/[0.07] rounded-xl px-4 py-3.5">
          <p className="text-[11px] text-[#71717a] font-medium mb-1">Replied</p>
          <p className="text-2xl font-bold tracking-[-0.03em]">{stats.totalReplied}</p>
        </div>

        <div className="bg-surface border border-white/[0.07] rounded-xl px-4 py-3.5">
          <p className="text-[11px] text-[#71717a] font-medium mb-1">Sent</p>
          <p className="text-2xl font-bold tracking-[-0.03em]">{stats.totalSent}</p>
        </div>

        <div className="bg-surface border border-white/[0.07] rounded-xl px-4 py-3.5">
          <p className="text-[11px] text-[#71717a] font-medium mb-1">Reply rate</p>
          <p className="text-2xl font-bold tracking-[-0.03em]">{stats.replyRate}%</p>
        </div>

        <div className="bg-surface border border-white/[0.07] rounded-xl px-4 py-3.5">
          <p className="text-[11px] text-[#71717a] font-medium mb-1">Streak</p>
          <p className="text-2xl font-bold tracking-[-0.03em]">{stats.currentStreak}w</p>
        </div>

        {stats.avgResponseTimeHrs !== null && (
          <div className="bg-surface border border-white/[0.07] rounded-xl px-4 py-3.5">
            <p className="text-[11px] text-[#71717a] font-medium mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Avg response
            </p>
            <p className="text-2xl font-bold tracking-[-0.03em]">
              {stats.avgResponseTimeHrs < 1 ? '<1h' : `${stats.avgResponseTimeHrs.toFixed(1)}h`}
            </p>
          </div>
        )}
      </div>

      {/* AI Insights card */}
      <div className="bg-surface border border-white/[0.07] rounded-xl p-5 border-l-2 border-l-accent/20">
        <h2 className="text-lg font-semibold text-white mb-3">AI Insights</h2>
        {insightsLoading ? (
          <div className="text-sm text-[#71717a] animate-pulse">Generating insights...</div>
        ) : (
          <div className="text-sm text-[#e4e4e7] leading-relaxed whitespace-pre-wrap">
            {insights}
          </div>
        )}
      </div>

      {/* Submission timeline */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Check-in History</h2>
        {submissions.length === 0 ? (
          <div className="bg-surface border border-white/[0.07] rounded-xl p-6 text-center">
            <p className="text-sm text-[#71717a]">No submissions sent yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub, idx) => {
              const hasReply = !!sub.replied_at && !!sub.response
              const weekLabel = format(parseISO(sub.week_start), 'MMM d, yyyy')

              return (
                <div key={sub.id} className={`relative pl-6 pb-4 ${idx !== submissions.length - 1 ? 'border-l border-white/[0.07]' : ''}`}>
                  {/* Timeline dot */}
                  <div className={`absolute left-[-9px] top-1 w-4 h-4 rounded-full border-2 ${hasReply ? 'bg-green-500 border-green-500' : 'bg-transparent border-[#52525b]'}`} />

                  {/* Week label */}
                  <p className="text-sm font-medium text-white mb-1">{weekLabel}</p>

                  {/* Status */}
                  <div className="flex items-center gap-2 mb-2">
                    {hasReply ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-green-400 font-medium">Replied</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#52525b]" />
                        <span className="text-xs text-[#71717a] font-medium">No reply</span>
                      </>
                    )}
                  </div>

                  {/* Response body */}
                  {hasReply && sub.response?.body_clean && (
                    <SubmissionResponseCard response={sub.response} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function SubmissionResponseCard({
  response,
}: {
  response: {
    id: string
    body_clean: string | null
    created_at: string
    manager_replies: { id: string; body_clean: string; sender_type: string; employee_name: string | null; created_at: string }[]
  }
}) {
  const [expanded, setExpanded] = useState(false)
  const body = response.body_clean || ''
  const isLong = body.length > 300
  const displayBody = expanded ? body : body.slice(0, 300)

  return (
    <div className="space-y-2">
      <div className="bg-white/[0.02] rounded-lg p-3.5 text-sm text-[#e4e4e7]">
        <p className="leading-relaxed">{displayBody}</p>
        {isLong && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-accent hover:text-accent/80 text-xs font-medium mt-2 transition-colors"
          >
            Read more →
          </button>
        )}
        {isLong && expanded && (
          <button
            onClick={() => setExpanded(false)}
            className="text-accent hover:text-accent/80 text-xs font-medium mt-2 transition-colors"
          >
            Read less ↑
          </button>
        )}
      </div>

      {/* Manager replies */}
      {response.manager_replies && response.manager_replies.length > 0 && (
        <div className="ml-3 space-y-2 border-l border-white/[0.07] pl-3">
          {response.manager_replies.map(reply => (
            <div key={reply.id} className="bg-white/[0.01] rounded-lg p-3 text-xs">
              <p className="font-medium text-[#71717a] mb-1">
                {reply.sender_type === 'manager' ? '👤 Manager' : `👥 ${reply.employee_name || 'Team member'}`}
              </p>
              <p className="text-[#a1a1aa] leading-relaxed">{reply.body_clean}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
