'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { Employee } from '@/types'
import { getInitials, avatarGradient } from '@/lib/utils'

const AddMemberModal = dynamic(() => import('@/components/team/add-member-modal').then(m => ({ default: m.AddMemberModal })))
const EditMemberModal = dynamic(() => import('@/components/team/edit-member-modal').then(m => ({ default: m.EditMemberModal })))
const ImportModal = dynamic(() => import('@/components/team/import-modal').then(m => ({ default: m.ImportModal })))
const SlackImportModal = dynamic(() => import('@/components/team/slack-import-modal').then(m => ({ default: m.SlackImportModal })))

type Props = { active: Employee[]; inactive: Employee[]; allTeams: string[]; hasSlack?: boolean; defaultDelivery?: 'email' | 'slack' }

// ── Slack icon reused across the component ───────────────────────────────
function SlackIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>
  )
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

export function TeamClient({ active, inactive, allTeams, hasSlack, defaultDelivery = 'email' }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showSlackImport, setShowSlackImport] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === '1'
  const slackImportParam = searchParams.get('slack_import') === '1'

  // Auto-open Slack import modal when redirected from Slack OAuth
  useEffect(() => {
    if (slackImportParam && hasSlack) {
      setShowSlackImport(true)
    }
  }, [slackImportParam, hasSlack])

  const isEmpty = active.length === 0

  return (
    <>
      {showModal && <AddMemberModal onClose={() => setShowModal(false)} allTeams={allTeams} />}
      {editingEmployee && <EditMemberModal employee={editingEmployee} allTeams={allTeams} onClose={() => setEditingEmployee(null)} />}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} />}
      {showSlackImport && <SlackImportModal onClose={() => setShowSlackImport(false)} defaultDelivery={defaultDelivery} />}

      {/* ── Empty state: import hub ──────────────────────────────────────── */}
      {isEmpty && (
        <div className="mb-8">
          {/* Onboarding header */}
          <div className="mb-6">
            <h1 className="text-[22px] font-bold tracking-[-0.03em] mb-1">Add your team</h1>
            <p className="text-sm text-[#71717a]">
              {isOnboarding
                ? 'Import the people who\'ll receive weekly check-ins. This takes about 30 seconds.'
                : 'Add the people who will receive weekly check-in emails.'}
            </p>
          </div>

          {/* Import options — order and copy adapt to chosen delivery method */}
          <div className="space-y-3">
            {/* Slack import: primary when delivery is 'slack', still shown for email as roster convenience */}
            {hasSlack && (
              <button
                onClick={() => setShowSlackImport(true)}
                className={`w-full text-left border rounded-xl px-5 py-4 transition-colors group ${
                  defaultDelivery === 'slack'
                    ? 'bg-[#4A154B]/10 border-[#4A154B]/30 hover:border-[#4A154B]/50'
                    : 'bg-[#4A154B]/10 border-[#4A154B]/30 hover:border-[#4A154B]/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#4A154B] flex items-center justify-center shrink-0">
                    <SlackIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-white">Import from Slack</p>
                      <span className="text-[10px] font-semibold text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded-full">Recommended</span>
                    </div>
                    <p className="text-xs text-[#a1a1aa]">
                      {defaultDelivery === 'slack'
                        ? 'Pull your team from Slack — everyone, or pick specific channels. Check-ins will be delivered via Slack DM.'
                        : 'Pull your team roster from Slack — everyone, or pick specific channels. Check-ins will be delivered via email.'}
                    </p>
                  </div>
                  <span className="text-[#52525b] group-hover:text-white transition-colors text-lg shrink-0">→</span>
                </div>
              </button>
            )}

            {/* Connect Slack first — shown if NOT connected */}
            {!hasSlack && (
              <a
                href="/api/slack/install"
                className="block w-full text-left bg-[#4A154B]/10 border border-[#4A154B]/30 hover:border-[#4A154B]/50 rounded-xl px-5 py-4 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#4A154B] flex items-center justify-center shrink-0">
                    <SlackIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-white">
                        {defaultDelivery === 'slack' ? 'Connect Slack to get started' : 'Connect Slack and import your team'}
                      </p>
                      <span className="text-[10px] font-semibold text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded-full">
                        {defaultDelivery === 'slack' ? 'Required' : 'Fastest'}
                      </span>
                    </div>
                    <p className="text-xs text-[#a1a1aa]">
                      {defaultDelivery === 'slack'
                        ? 'Connect your Slack workspace to import your team and deliver check-ins via DM.'
                        : 'Connect your Slack workspace to pull your team roster in seconds. Check-ins will still go via email.'}
                    </p>
                  </div>
                  <span className="text-[#52525b] group-hover:text-white transition-colors text-lg shrink-0">→</span>
                </div>
              </a>
            )}

            {/* Option 2: CSV / Spreadsheet import */}
            <button
              onClick={() => setShowImportModal(true)}
              className="w-full text-left bg-[#09090b] border border-white/[0.08] hover:border-white/[0.18] rounded-xl px-5 py-4 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#a1a1aa]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" x2="8" y1="13" y2="13"/>
                    <line x1="16" x2="8" y1="17" y2="17"/>
                    <line x1="10" x2="8" y1="9" y2="9"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white mb-0.5">Import from CSV or spreadsheet</p>
                  <p className="text-xs text-[#71717a]">Paste from Excel / Google Sheets, upload a CSV, or link a Google Sheet directly.</p>
                </div>
                <span className="text-[#52525b] group-hover:text-white transition-colors text-lg shrink-0">→</span>
              </div>
            </button>

            {/* Option 3: Add manually */}
            <button
              onClick={() => setShowModal(true)}
              className="w-full text-left bg-[#09090b] border border-white/[0.08] hover:border-white/[0.18] rounded-xl px-5 py-4 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#a1a1aa]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <line x1="19" x2="19" y1="8" y2="14"/>
                    <line x1="22" x2="16" y1="11" y2="11"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white mb-0.5">Add members one by one</p>
                  <p className="text-xs text-[#71717a]">Type in each person's name and email. Best for small teams.</p>
                </div>
                <span className="text-[#52525b] group-hover:text-white transition-colors text-lg shrink-0">→</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── Normal header (when team has members) ─────────────────────────── */}
      {!isEmpty && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.03em] mb-0.5">Team</h1>
            <p className="text-sm text-[#71717a]">{active.length} active member{active.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasSlack && (
              <button
                onClick={() => setShowSlackImport(true)}
                className="text-sm border border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20 px-4 py-2 rounded-md transition-colors flex items-center gap-1.5"
              >
                <SlackIcon size={12} />
                Import from Slack
              </button>
            )}
            <button
              onClick={() => setShowImportModal(true)}
              className="text-sm border border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20 px-4 py-2 rounded-md transition-colors"
            >
              Bulk Import
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="text-sm font-semibold bg-white text-black px-4 py-2 rounded-md hover:bg-white/90 transition-colors flex items-center gap-1.5"
            >
              <span className="text-lg leading-none">+</span> Add member
            </button>
          </div>
        </div>
      )}

      {/* Manager summary — only shown when managers exist */}
      {(() => {
        const managers = active.filter((e) => e.manager_of_teams && e.manager_of_teams.length > 0)
        if (managers.length === 0) return null
        return (
          <div className="mb-6 bg-surface border border-white/[0.07] rounded-xl p-5">
            <p className="text-xs font-semibold tracking-[0.06em] uppercase text-[#71717a] mb-3">
              Managers ({managers.length})
            </p>
            <div className="space-y-2.5">
              {managers.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarGradient(m.email)} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                    {getInitials(m.name)}
                  </div>
                  <span className="text-sm font-medium text-white">{m.name}</span>
                  <span className="text-xs text-[#52525b]">→</span>
                  <div className="flex flex-wrap gap-1">
                    {(m.manager_of_teams ?? []).map((team) => (
                      <span key={team} className="text-[11px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                        {team}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Active employees */}
      <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.07] grid grid-cols-[1fr_80px] sm:grid-cols-[2fr_1.5fr_1.5fr_100px_40px] text-xs font-medium text-[#71717a] uppercase tracking-[0.06em]">
          <span>Name</span>
          <span className="hidden sm:block">Team</span>
          <span className="hidden sm:block">Function</span>
          <span>Role</span>
          <span className="hidden sm:block" />
        </div>

        {active.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#52525b]">No team members yet. Use the options above to get started.</p>
          </div>
        ) : (
          active.map((emp: Employee, i: number): React.ReactNode => {
            const isManager = emp.manager_of_teams && emp.manager_of_teams.length > 0
            return (
              <div
                key={emp.id}
                onClick={() => router.push(`/team/${emp.id}`)}
                className={`group px-5 py-3.5 grid grid-cols-[1fr_80px] sm:grid-cols-[2fr_1.5fr_1.5fr_100px_40px] items-center cursor-pointer ${i < active.length - 1 ? 'border-b border-white/[0.05]' : ''} hover:bg-white/[0.02] transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGradient(emp.email)} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                    {getInitials(emp.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/team/${emp.id}`} className="text-[13.5px] font-medium truncate hover:text-accent transition-colors">
                        {emp.name}
                      </Link>
                      <span className="text-[10px] font-medium text-accent/50 group-hover:text-accent transition-colors shrink-0 hidden sm:inline">
                        View profile →
                      </span>
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
                <div className="hidden sm:flex justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingEmployee(emp) }}
                    title="Edit member"
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[#52525b] hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                    </svg>
                  </button>
                </div>
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
                className={`px-5 py-3.5 grid grid-cols-[1fr_80px] sm:grid-cols-[2fr_1.5fr_1.5fr_100px_40px] items-center opacity-50 ${i < inactive.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
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
                <div className="hidden sm:flex justify-end">
                  <button
                    onClick={() => setEditingEmployee(emp)}
                    title="Edit member"
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[#52525b] hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
