'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import type { Employee } from '@/types'
import { getInitials, avatarGradient, cn } from '@/lib/utils'
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
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/team/${employee.id}/insights`)
      .then(r => r.json())
      .then(data => setInsights(data.insights))
      .catch(() => setInsights('Unable to generate insights at this time.'))
      .finally(() => setInsightsLoading(false))
  }, [employee.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (chatOpen) chatInputRef.current?.focus()
  }, [chatOpen])

  const firstName = employee.name.split(' ')[0]

  async function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return
    const question = chatInput.trim()
    setChatInput('')
    setChatError(null)
    setChatMessages(prev => [...prev, { sender: 'user', text: question }])
    setChatLoading(true)
    try {
      const res = await fetch(`/api/team/${employee.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setChatError(data.detail ?? data.error ?? `Failed (${res.status})`)
        return
      }
      const { answer } = await res.json()
      setChatMessages(prev => [...prev, { sender: 'assistant', text: answer }])
    } catch (err: any) {
      setChatError(err?.message ?? 'Network error')
    } finally {
      setChatLoading(false)
    }
  }

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

      {/* AI Insights card with inline chat */}
      <div className="bg-surface border border-white/[0.07] rounded-xl p-5 border-l-2 border-l-accent/20">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">AI Insights</h2>
          {!insightsLoading && insights && (
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={cn(
                'text-[11px] font-medium flex items-center gap-1.5 transition-colors',
                chatOpen ? 'text-accent' : 'text-accent/70 hover:text-accent',
              )}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {chatOpen ? 'Close chat' : 'Ask a question'}
            </button>
          )}
        </div>

        {insightsLoading ? (
          <div className="text-sm text-[#71717a] animate-pulse">Generating insights...</div>
        ) : (
          <div className="text-sm text-[#e4e4e7] leading-relaxed whitespace-pre-wrap">
            {insights}
          </div>
        )}

        {/* Inline chat */}
        {chatOpen && (
          <div className="mt-4 pt-4 border-t border-white/[0.07]">
            {chatMessages.length > 0 && (
              <div className="max-h-72 overflow-y-auto mb-3 space-y-3">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={cn('flex gap-2.5', msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-xs px-3.5 py-2.5 rounded-lg text-sm leading-relaxed',
                      msg.sender === 'user'
                        ? 'bg-accent/20 text-white border border-accent/30'
                        : 'bg-white/[0.04] text-[#d4d4d8] border border-white/[0.08]'
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex gap-2.5 justify-start">
                    <div className="bg-white/[0.04] text-[#d4d4d8] border border-white/[0.08] px-3.5 py-2.5 rounded-lg flex items-center gap-1.5">
                      <span className="text-xs text-[#a1a1aa]">Thinking</span>
                      <div className="flex gap-0.5">
                        <span className="inline-block w-1.5 h-1.5 bg-[#a1a1aa] rounded-full animate-pulse" />
                        <span className="inline-block w-1.5 h-1.5 bg-[#a1a1aa] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <span className="inline-block w-1.5 h-1.5 bg-[#a1a1aa] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}

            {chatError && <p className="text-xs text-red-400 mb-2">{chatError}</p>}

            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Ask about ${firstName}…`}
                disabled={chatLoading}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#71717a] focus:outline-none focus:border-accent/40 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                aria-label="Send"
              >
                <SendIcon />
              </button>
            </form>
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

// ── Shared helpers ──────────────────────────────────────────────────────────

type ChatMessage = { sender: 'user' | 'assistant'; text: string }

function SendIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7m0 0l-7 7m7-7H6" />
    </svg>
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
