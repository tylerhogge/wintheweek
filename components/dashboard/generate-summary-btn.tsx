'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

type Props = { weekStart: string }

export function GenerateSummaryBtn({ weekStart }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/insights/generate-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to generate')
      } else {
        router.refresh() // re-fetch server data so AISummary shows up
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-5">
      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-2 text-[12px] font-medium text-[#71717a] hover:text-white border border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.05] px-3 py-2 rounded-lg transition-all disabled:opacity-50"
      >
        <Sparkles className={`w-3.5 h-3.5 ${loading ? 'animate-pulse text-accent' : ''}`} />
        {loading ? 'Generating AI summary…' : 'Generate AI summary'}
      </button>
      {error && <p className="text-[11px] text-red-400 mt-1.5">{error}</p>}
    </div>
  )
}
