'use client'

import { useState } from 'react'

export function OrgNameEdit({ initialName }: { initialName: string }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [draft, setDraft] = useState(initialName)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!draft.trim() || draft === name) { setEditing(false); return }
    setSaving(true)
    const res = await fetch('/api/settings/org', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: draft.trim() }),
    })
    if (res.ok) setName(draft.trim())
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          className="bg-[#18181b] border border-accent/40 text-white text-sm px-2.5 py-1 rounded-md outline-none w-48"
        />
        <button
          onClick={save}
          disabled={saving}
          className="text-xs font-medium text-white bg-accent/80 hover:bg-accent px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-[#71717a] hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between w-full">
      <div>
        <p className="text-sm font-medium">Organization name</p>
        <p className="text-xs text-[#71717a] mt-0.5">{name}</p>
      </div>
      <button
        onClick={() => { setDraft(name); setEditing(true) }}
        className="text-xs border border-white/10 text-[#a1a1aa] hover:text-white px-3 py-1.5 rounded-md transition-colors"
      >
        Edit
      </button>
    </div>
  )
}
