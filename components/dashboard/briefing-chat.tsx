'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

type Message = {
  sender: 'user' | 'assistant'
  text: string
}

type Props = {
  weekStart: string
  hasInsight: boolean
}

function SendIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 5l7 7m0 0l-7 7m7-7H6"
      />
    </svg>
  )
}

export function BriefingChat({ weekStart, hasInsight }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (!hasInsight) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const question = input.trim()
    setInput('')
    setError(null)

    // Add user message immediately
    setMessages(prev => [...prev, { sender: 'user', text: question }])
    setLoading(true)

    try {
      const res = await fetch('/api/briefing-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, weekStart }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = data.detail ?? data.error ?? `Failed (${res.status})`
        setError(msg)
        console.error('[briefing-chat]', msg)
        return
      }

      const { answer } = await res.json()
      setMessages(prev => [...prev, { sender: 'assistant', text: answer }])
    } catch (err: any) {
      const msg = err?.message ?? 'Network error'
      setError(msg)
      console.error('[briefing-chat]', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-5 border border-white/[0.08] rounded-xl overflow-hidden bg-white/[0.02]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.06] bg-white/[0.01]">
        <p className="text-sm font-medium text-[#e4e4e7]">Ask about this week's briefing</p>
        <p className="text-xs text-[#a1a1aa] mt-0.5">Get instant insights from your briefing data</p>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-xs text-[#71717a]">Ask a question about this week's briefing…</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              'flex gap-2.5',
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-xs px-3.5 py-2.5 rounded-lg text-sm leading-relaxed',
                msg.sender === 'user'
                  ? 'bg-accent/20 text-white border border-accent/30'
                  : 'bg-white/[0.04] text-[#d4d4d8] border border-white/[0.08]'
              )}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
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

        <div ref={messagesEndRef} />
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-400/10 border-t border-white/[0.06]">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Input footer */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-white/[0.06] px-4 py-3 bg-white/[0.01] flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this week…"
          disabled={loading}
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#71717a] focus:outline-none focus:border-accent/40 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  )
}
