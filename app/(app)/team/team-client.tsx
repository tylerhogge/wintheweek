'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import type { Employee } from '@/types'
import { getInitials, avatarGradient } from '@/lib/utils'
import { AddMemberModal } from '@/components/team/add-member-modal'

type Props = { active: Employee[]; inactive: Employee[] }

function parseCSV(text: string) {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''))
  return lines.slice(1).map(line => {
    // handle quoted fields with commas inside
    const cols: string[] = []
    let cur = '', inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    cols.push(cur.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = cols[i] ?? '' })
    return {
      name: row.name ?? row.fullname ?? row.firstname ?? '',
      email: row.email ?? row.emailaddress ?? '',
      team: row.team ?? row.department ?? '',
      function: row.function ?? row.role ?? row.title ?? row.jobtitle ?? '',
    }
  }).filter(r => r.name && r.email)
}

export function TeamClient({ active, inactive }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const csvRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === '1'

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const text = await file.text()
      const members = parseCSV(text)
      if (members.length === 0) {
        setImportResult({ ok: false, msg: 'No valid rows found. CSV needs at least name and email columns.' })
        return
      }
      const res = await fetch('/api/team/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members }),
      })
      const data = await res.json()
      if (res.ok) {
        setImportResult({ ok: true, msg: `Imported ${data.imported} member${data.imported !== 1 ? 's' : ''}` })
        router.refresh()
      } else {
        setImportResult({ ok: false, msg: data.error ?? 'Import failed' })
      }
    } catch {
      setImportResult({ ok: false, msg: 'Failed to read file' })
    } finally {
      setImporting(false)
      if (csvRef.current) csvRef.current.value = ''
    }
  }

  return (
    <>
      {showModal && <AddMemberModal onClose={() => setShowModal(false)} />}

      {/* Hidden file input */}
      <input
        ref={csvRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleCSV}
      />

      {/* Onboarding welcome banner */}
      {isOnboarding && active.length === 0 && (
        <div className="mb-6 bg-accent/10 border border-accent/20 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="text-xl mt-0.5">🎉</span>
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">Workspace created! Now add your team.</p>
            <p className="text-sm text-[#a1a1aa]">Add the people who will receive weekly check-in emails. You can always add more later.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] mb-0.5">Team</h1>
          <p className="text-sm text-[#71717a]">{active.length} active member{active.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => csvRef.current?.click()}
            disabled={importing}
            className="text-sm border border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20 px-4 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm font-semibold bg-white text-black px-4 py-2 rounded-md hover:bg-white/90 transition-colors flex items-center gap-1.5"
          >
            <span className="text-lg leading-none">+</span> Add member
          </button>
        </div>
      </div>

      {/* Import result toast */}
      {importResult && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center justify-between ${importResult.ok ? 'bg-accent/10 border border-accent/20 text-accent' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {importResult.msg}
          <button onClick={() => setImportResult(null)} className="ml-4 opacity-60 hover:opacity-100 text-lg leading-none">×</button>
        </div>
      )}

      {/* Active employees */}
      <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.07] grid grid-cols-[2fr_1.5fr_1.5fr_100px] text-xs font-medium text-[#71717a] uppercase tracking-[0.06em]">
          <span>Name</span>
          <span>Team</span>
          <span>Function</span>
          <span>Status</span>
        </div>

        {active.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-white mb-1">No team members yet</p>
            <p className="text-sm text-[#71717a] mb-5">Add your first member to start sending check-ins.</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-sm font-semibold bg-accent text-black px-4 py-2 rounded-md hover:bg-accent/90 transition-colors"
            >
              Add first member →
            </button>
          </div>
        ) : (
          active.map((emp: Employee, i: number): React.ReactNode => (
            <div
              key={emp.id}
              className={`px-5 py-3.5 grid grid-cols-[2fr_1.5fr_1.5fr_100px] items-center ${i < active.length - 1 ? 'border-b border-white/[0.05]' : ''} hover:bg-white/[0.02] transition-colors`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGradient(emp.email)} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                  {getInitials(emp.name)}
                </div>
                <div>
                  <p className="text-[13.5px] font-medium">{emp.name}</p>
                  <p className="text-xs text-[#71717a]">{emp.email}</p>
                </div>
              </div>
              <span className="text-sm text-[#a1a1aa]">{emp.team ?? '—'}</span>
              <span className="text-sm text-[#a1a1aa]">{emp.function ?? '—'}</span>
              <span className="text-xs font-medium text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full w-fit">
                Active
              </span>
            </div>
          ))
        )}
      </div>

      {/* Inactive */}
      {inactive.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-medium text-[#71717a] uppercase tracking-[0.06em] mb-3">Inactive ({inactive.length})</p>
          <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
            {inactive.map((emp: Employee, i: number): React.ReactNode => (
              <div
                key={emp.id}
                className={`px-5 py-3.5 grid grid-cols-[2fr_1.5fr_1.5fr_100px] items-center opacity-50 ${i < inactive.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-surface2 border border-white/10 flex items-center justify-center text-[11px] font-bold text-[#52525b] shrink-0">
                    {getInitials(emp.name)}
                  </div>
                  <div>
                    <p className="text-[13.5px] font-medium">{emp.name}</p>
                    <p className="text-xs text-[#71717a]">{emp.email}</p>
                  </div>
                </div>
                <span className="text-sm text-[#71717a]">{emp.team ?? '—'}</span>
                <span className="text-sm text-[#71717a]">{emp.function ?? '—'}</span>
                <span className="text-xs text-[#52525b]">Inactive</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
