'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { Insight } from '@/types'

type Props = { insight: Insight; weekStart: string; className?: string }

type ChatMessage = { sender: 'user' | 'assistant'; text: string }

function Section({ title, content }: { title: string; content: string }) {
  const paragraphs = content.split('\n\n').filter(Boolean)
  return (
    <div>
      <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-accent/80 mb-2">
        {title}
      </h3>
      <div className="flex flex-col gap-3">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className="text-sm text-[#c4c4cc] leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: p.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>'),
            }}
          />
        ))}
      </div>
    </div>
  )
}

function SendIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7m0 0l-7 7m7-7H6" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}

export function AISummary({ insight, weekStart, className }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (chatOpen) inputRef.current?.focus()
  }, [chatOpen])

  if (!insight.summary) return null

  const hasFullBriefing = insight.cross_functional_themes || insight.risk_items || insight.bottom_line || insight.initiative_tracking

  function sentimentColor(score: number) {
    if (score >= 8) return 'text-accent'
    if (score >= 6) return 'text-blue-400'
    if (score >= 4) return 'text-yellow-500'
    if (score >= 2) return 'text-orange-500'
    return 'text-red-400'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const question = input.trim()
    setInput('')
    setError(null)
    setMessages((prev) => [...prev, { sender: 'user', text: question }])
    setLoading(true)

    try {
      const res = await fetch('/api/briefing-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, weekStart }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.detail ?? data.error ?? `Failed (${res.status})`)
        return
      }

      const { answer } = await res.json()
      setMessages((prev) => [...prev, { sender: 'assistant', text: answer }])
    } catch (err: any) {
      setError(err?.message ?? 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn('bg-accent/[0.06] border border-accent/[0.18] rounded-xl px-5 py-4', className)}>
      {/* Header + Sentiment + Actions */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-accent flex items-center gap-1.5">
            <span>✦</span> CEO Briefing
          </p>
          {insight.sentiment_score != null && (
            <span className={`text-[10px] font-semibold ${sentimentColor(insight.sentiment_score)}`}>
              Sentiment: {insight.sentiment_label ?? 'Mood'} {insight.sentiment_score}/10
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setChatOpen(!chatOpen); if (!chatOpen) setExpanded(true) }}
            className={cn(
              'text-[11px] font-medium flex items-center gap-1.5 transition-colors',
              chatOpen
                ? 'text-accent'
                : 'text-accent/70 hover:text-accent',
            )}
          >
            <ChatIcon />
            {chatOpen ? 'Close chat' : 'Ask a question'}
          </button>
          {hasFullBriefing && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] font-medium text-accent/70 hover:text-accent transition-colors"
            >
              {expanded ? 'Collapse' : 'Read full briefing →'}
            </button>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      {insight.summary && (
        <div className="mb-3">
          <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-accent/80 mb-2">
            Executive Summary
          </h3>
          <p className="text-sm text-[#e4e4e7] leading-relaxed">{insight.summary}</p>
        </div>
      )}

      {/* Bottom Line */}
      {insight.bottom_line && (
        <div className="mb-3">
          <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-accent/80 mb-2">
            Bottom Line
          </h3>
          <p className="text-sm text-[#e4e4e7] leading-relaxed">{insight.bottom_line}</p>
        </div>
      )}

      {/* Highlights */}
      {insight.highlights && insight.highlights.length > 0 && (
        <ul className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-white/[0.06]">
          {insight.highlights.map((h: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#d4d4d8]">
              <span className="text-accent font-bold text-xs mt-0.5 shrink-0">→</span>
              {h}
            </li>
          ))}
        </ul>
      )}

      {/* Themes pills */}
      {insight.themes && insight.themes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/[0.06]">
          {(insight.themes as string[]).map((theme: string) => (
            <span
              key={theme}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[#a1a1aa]"
            >
              {theme}
            </span>
          ))}
        </div>
      )}

      {/* Expanded: full briefing sections */}
      {expanded && hasFullBriefing && (
        <div className="mt-4 pt-4 border-t border-white/[0.08] flex flex-col gap-5">
          {insight.cross_functional_themes && (
            <Section title="Cross-Functional Themes" content={insight.cross_functional_themes} />
          )}
          {insight.risk_items && (
            <Section title="Risk & Decision Items" content={insight.risk_items} />
          )}
          {insight.initiative_tracking && (
            <Section title="Initiative Tracking" content={insight.initiative_tracking} />
          )}
        </div>
      )}

      {/* Inline chat — inside the briefing card */}
      {chatOpen && (
        <div className="mt-4 pt-4 border-t border-white/[0.08]">
          {/* Messages */}
          {messages.length > 0 && (
            <div className="max-h-72 overflow-y-auto mb-3 flex flex-col gap-2.5">
              {messages.map((msg, idx) => (
                <div key={idx} className={cn('flex', msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[80%] px-3.5 py-2.5 rounded-lg text-sm leading-relaxed',
                      msg.sender === 'user'
                        ? 'bg-accent/20 text-white border border-accent/30'
                        : 'bg-white/[0.04] text-[#d4d4d8] border border-white/[0.08]',
                    )}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1 opacity-60">
                      {msg.sender === 'user' ? 'You' : 'Win The Week'}
                    </p>
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 rounded-lg flex items-center gap-1.5">
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

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 mb-2">{error}</p>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about this week..."
              disabled={loading}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#71717a] focus:outline-none focus:border-accent/40 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Send"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
