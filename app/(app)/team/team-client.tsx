'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import type { Employee } from '@/types'
import { getInitials, avatarGradient } from '@/lib/utils'
import { AddMemberModal } from '@/components/team/add-member-modal'

type Props = { active: Employee[]; inactive: Employee[]; allTeams: string[] }

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

// ── Manager badge shown inline next to name ───────────────────────────────
function ManagerBadge({ teams }: { teams: string[] }) {
  return (
    <span
      title={`Manages: ${teams.join(', ')}`}
      className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full shrink-0"
    >
      Manager
    </span>
  )
}

// ── Expanded row for assigning manager teams ──────────────────────────────
function ManagerEditor({
  employee,
  allTeams,
  onClose,
}: {
  employee: Employee
  allTeams: string[]
  onClose: () => void
}) {
  const router = useRouter()
  const current = employee.manager_of_teams ?? []
  const [selected, setSelected] = useState<string[]>(current)
  const [saving, setSaving] = useState(false)

  function toggleTeam(team: string) {
    setSelected((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    )
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/team/manager', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employee.id,
        manager_of_teams: selected.length > 0 ? selected : null,
      }),
    })
    setSaving(false)
    router.refresh()
    onClose()
  }

  const changed = JSON.stringify(selected.sort()) !== JSON.stringify([...current].sort())

  return (
    <div className="px-5 py-4 bg-white/[0.02] border-t border-white/[0.05]">
      <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-[0.06em] mb-3">
        Manager of teams
      </p>
      <p className="text-xs text-[#71717a] mb-3">
        {employee.name.split(' ')[0]} will receive a digest email with replies from these teams.
      </p>
      {allTeams.length === 0 ? (
        <p className="text-xs text-[#52525b]">No teams found. Assign teams to employees first.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {allTeams.map((team) => {
            const isSelected = selected.includes(team)
            return (
              <button
                key={team}
                onClick={() => toggleTeam(team)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  isSelected
                    ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                    : 'border-white/10 text-[#71717a] hover:text-white hover:border-white/20'
                }`}
              >
                {team}
              </button>
            )
          })}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !changed}
          className="text-xs font-semibold bg-white text-black px-3.5 py-1.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onClose}
          className="text-xs text-[#71717a] hover:text-white px-3.5 py-1.5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function TeamClient({ active, inactive, allTeams }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
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
        <div className="px-5 py-3 border-b border-white/[0.07] grid grid-cols-[1fr_80px] sm:grid-cols-[2fr_1.5fr_1.5fr_100px] text-xs font-medium text-[#71717a] uppercase tracking-[0.06em]">
          <span>Name</span>
          <span className="hidden sm:block">Team</span>
          <span className="hidden sm:block">Function</span>
          <span>Role</span>
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
          active.map((emp: Employee, i: number): React.ReactNode => {
            const isManager = emp.manager_of_teams && emp.manager_of_teams.length > 0
            const isExpanded = expandedId === emp.id
            return (
              <div key={emp.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                  className={`px-5 py-3.5 grid grid-cols-[1fr_80px] sm:grid-cols-[2fr_1.5fr_1.5fr_100px] items-center cursor-pointer ${i < active.length - 1 && !isExpanded ? 'border-b border-white/[0.05]' : ''} hover:bg-white/[0.02] transition-colors`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGradient(emp.email)} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                      {getInitials(emp.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13.5px] font-medium truncate">{emp.name}</p>
                        {emp.slack_user_id && (
                          <span title="Receives check-ins via Slack" className="text-[#a1a1aa] shrink-0">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#71717a] truncate">{emp.email}</p>
                    </div>
                  </div>
                  <span className="hidden sm:block text-sm text-[#a1a1aa] truncate">{emp.team ?? '—'}</span>
                  <span className="hidden sm:block text-sm text-[#a1a1aa] truncate">{emp.function ?? '—'}</span>
                  <div>
                    {isManager ? (
                      <ManagerBadge teams={emp.manager_of_teams!} />
                    ) : (
                      <span className="text-xs text-[#52525b]">Member</span>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <ManagerEditor
                    employee={emp}
                    allTeams={allTeams}
                    onClose={() => setExpandedId(null)}
                  />
                )}
                {isExpanded && i < active.length - 1 && (
                  <div className="border-b border-white/[0.05]" />
                )}
              </div>
            )
          })
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
                className={`px-5 py-3.5 grid grid-cols-[1fr_80px] sm:grid-cols-[2fr_1.5fr_1.5fr_100px] items-center opacity-50 ${i < inactive.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-surface2 border border-white/10 flex items-center justify-center text-[11px] font-bold text-[#52525b] shrink-0">
                    {getInitials(emp.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium truncate">{emp.name}</p>
                    <p className="text-xs text-[#71717a] truncate">{emp.email}</p>
                  </div>
                </div>
                <span className="hidden sm:block text-sm text-[#71717a] truncate">{emp.team ?? '—'}</span>
                <span className="hidden sm:block text-sm text-[#71717a] truncate">{emp.function ?? '—'}</span>
                <span className="text-xs text-[#52525b]">Inactive</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
