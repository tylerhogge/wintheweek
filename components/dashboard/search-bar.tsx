'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { formatWeekRange } from '@/lib/utils'

type SearchResult = {
  response_id: string
  snippet: string
  match_index: number
  created_at: string
  week_start: string
  replied_at: string | null
  employee: { id: string; name: string; team: string | null } | null
}

export function SearchBar() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results ?? [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(query), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, doSearch])

  // Focus input when opening
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
      // Cmd+K or Ctrl+K to toggle
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  function highlightSnippet(snippet: string, q: string) {
    if (!q) return snippet
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = snippet.split(regex)
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-accent/20 text-accent rounded px-0.5">{part}</mark>
        : part
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-[12px] text-[#a1a1aa] hover:text-white border border-white/[0.08] hover:border-white/[0.15] rounded-lg px-3 py-1.5 transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search all weeks</span>
        <kbd className="hidden sm:inline text-[10px] text-[#52525b] border border-white/[0.08] rounded px-1 py-0.5 ml-2">⌘K</kbd>
      </button>
    )
  }

  return (
    <div className="relative w-full">
      {/* Search input */}
      <div className="flex items-center gap-2 bg-surface border border-white/[0.12] rounded-lg px-3 py-2">
        <Search className="w-4 h-4 text-[#a1a1aa] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, keyword, customer, topic…"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-[#52525b] outline-none"
        />
        {loading && <Loader2 className="w-4 h-4 text-[#a1a1aa] animate-spin shrink-0" />}
        <button onClick={() => { setOpen(false); setQuery(''); setResults([]) }} className="text-[#71717a] hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Results dropdown */}
      {searched && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-white/[0.1] rounded-xl shadow-2xl max-h-[400px] overflow-y-auto z-50">
          {results.length === 0 && !loading ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-[#a1a1aa]">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-[#71717a] mt-1">Try different keywords or check spelling</p>
            </div>
          ) : (
            <div className="py-1">
              {results.map((r) => (
                <a
                  key={r.response_id}
                  href={`/dashboard?week=${r.week_start}`}
                  className="block px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-white">{r.employee?.name ?? 'Unknown'}</span>
                    {r.employee?.team && (
                      <span className="text-[10px] font-medium text-[#a1a1aa] border border-white/[0.08] px-1.5 py-0.5 rounded-full bg-white/[0.03]">
                        {r.employee.team}
                      </span>
                    )}
                    <span className="text-[10px] text-[#71717a] ml-auto">
                      {r.week_start ? formatWeekRange(r.week_start) : ''}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-[#d4d4d8] leading-relaxed line-clamp-2">
                    {highlightSnippet(r.snippet, query)}
                  </p>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
