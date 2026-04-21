'use client'

import { useState } from 'react'
import type { Priority } from '@/types'

type Props = {
  initialPriorities: Priority[]
}

export function PrioritiesEditor({ initialPriorities }: Props) {
  const [priorities, setPriorities] = useState<Priority[]>(
    initialPriorities.length > 0 ? initialPriorities : [{ name: '', description: '' }],
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)

  function addPriority() {
    if (priorities.length >= 7) return
    setPriorities([...priorities, { name: '', description: '' }])
  }

  function removePriority(index: number) {
    setPriorities(priorities.filter((_, i) => i !== index))
  }

  function updatePriority(index: number, field: 'name' | 'description', value: string) {
    const updated = [...priorities]
    updated[index] = { ...updated[index], [field]: value }
    setPriorities(updated)
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(false)
    const cleaned = priorities.filter((p) => p.name.trim().length > 0)

    try {
      const res = await fetch('/api/settings/priorities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priorities: cleaned }),
      })

      if (!res.ok) {
        setError(true)
        setSaving(false)
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3">
        {priorities.map((p, i) => (
          <div key={i} className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1.5">
              <input
                type="text"
                placeholder="Priority name (e.g. Launch State Farm partnership)"
                value={p.name}
                onChange={(e) => updatePriority(i, 'name', e.target.value)}
                className="w-full bg-[#18181b] border border-white/10 text-white text-sm px-3 py-2 rounded-md outline-none focus:border-accent/50 placeholder-[#52525b] transition-colors"
              />
              <input
                type="text"
                placeholder="Brief description (optional)"
                value={p.description}
                onChange={(e) => updatePriority(i, 'description', e.target.value)}
                className="w-full bg-[#18181b] border border-white/10 text-white text-xs px-3 py-1.5 rounded-md outline-none focus:border-accent/50 placeholder-[#52525b] transition-colors"
              />
            </div>
            {priorities.length > 1 && (
              <button
                onClick={() => removePriority(i)}
                className="text-[#52525b] hover:text-red-400 transition-colors self-start mt-2 px-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-4">
        {priorities.length < 7 && (
          <button
            onClick={addPriority}
            className="text-xs text-[#a1a1aa] hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-md transition-colors"
          >
            + Add priority
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs font-semibold bg-accent text-black px-4 py-1.5 rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save priorities'}
        </button>
        {error && (
          <span className="text-[10px] text-red-400">Failed to save — please try again</span>
        )}
        {priorities.length >= 7 && (
          <span className="text-[10px] text-[#52525b]">Maximum 7 priorities</span>
        )}
      </div>
    </div>
  )
}
