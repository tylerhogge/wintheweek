'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type ParsedMember = { name: string; email: string; team: string; function: string }

// ── CSV / TSV parser (handles both comma and tab delimiters) ────────────
function parseDelimited(text: string): ParsedMember[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []

  // Detect delimiter: if tabs in first line, use tab; otherwise comma
  const delimiter = lines[0].includes('\t') ? '\t' : ','

  const headers = lines[0]
    .split(delimiter)
    .map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ''))

  return lines
    .slice(1)
    .map((line) => {
      if (delimiter === '\t') {
        // Tab-separated: no quoting issues
        const cols = line.split('\t').map((c) => c.trim())
        const row: Record<string, string> = {}
        headers.forEach((h, i) => { row[h] = cols[i] ?? '' })
        return toMember(row)
      }
      // Comma-separated: handle quoted fields
      const cols: string[] = []
      let cur = ''
      let inQuote = false
      for (const ch of line) {
        if (ch === '"') inQuote = !inQuote
        else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
        else cur += ch
      }
      cols.push(cur.trim())
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = cols[i] ?? '' })
      return toMember(row)
    })
    .filter((r) => r.name && r.email)
}

function toMember(row: Record<string, string>): ParsedMember {
  return {
    name: row.name ?? row.fullname ?? row.firstname ?? '',
    email: row.email ?? row.emailaddress ?? '',
    team: row.team ?? row.department ?? '',
    function: row.function ?? row.role ?? row.title ?? row.jobtitle ?? '',
  }
}

// ── Google Sheets URL → CSV export URL ──────────────────────────────────
function sheetsUrlToCsvUrl(url: string): string | null {
  // Handle: https://docs.google.com/spreadsheets/d/{ID}/edit...
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) return null
  const id = match[1]
  // Extract gid if present
  const gidMatch = url.match(/gid=(\d+)/)
  const gid = gidMatch ? gidMatch[1] : '0'
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
}

// ── Downloadable CSV template ───────────────────────────────────────────
function downloadTemplate() {
  const csv = 'name,email,team,function\nJane Smith,jane@company.com,Engineering,Frontend Developer\nMike Johnson,mike@company.com,Sales,Account Executive\n'
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'team-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Modal ───────────────────────────────────────────────────────────────
type Props = { onClose: () => void }

type Tab = 'paste' | 'csv' | 'sheets'

export function ImportModal({ onClose }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<Tab>('paste')
  const [pasteText, setPasteText] = useState('')
  const [sheetsUrl, setSheetsUrl] = useState('')
  const [preview, setPreview] = useState<ParsedMember[]>([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ imported: number; welcomed: number } | null>(null)
  const [sheetsLoading, setSheetsLoading] = useState(false)

  // ── Parse handlers ──────────────────────────────────────────────────
  function handlePaste(text: string) {
    setPasteText(text)
    setError(null)
    setResult(null)
    const parsed = parseDelimited(text)
    setPreview(parsed)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setResult(null)
    const text = await file.text()
    const parsed = parseDelimited(text)
    setPreview(parsed)
    if (parsed.length === 0) {
      setError('No valid rows found. Make sure your CSV has at least name and email columns.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSheetsUrl() {
    setError(null)
    setResult(null)
    setSheetsLoading(true)
    const csvUrl = sheetsUrlToCsvUrl(sheetsUrl)
    if (!csvUrl) {
      setError('Invalid Google Sheets URL. Make sure it looks like: https://docs.google.com/spreadsheets/d/.../edit')
      setSheetsLoading(false)
      return
    }
    try {
      const res = await fetch(csvUrl)
      if (!res.ok) {
        setError('Could not fetch the sheet. Make sure it\'s set to "Anyone with the link can view".')
        setSheetsLoading(false)
        return
      }
      const text = await res.text()
      const parsed = parseDelimited(text)
      setPreview(parsed)
      if (parsed.length === 0) {
        setError('No valid rows found. Make sure the first row has column headers (name, email, etc.)')
      }
    } catch {
      setError('Failed to fetch the sheet. Check the URL and sharing settings.')
    } finally {
      setSheetsLoading(false)
    }
  }

  // ── Import ──────────────────────────────────────────────────────────
  async function handleImport() {
    if (preview.length === 0) return
    setImporting(true)
    setError(null)
    try {
      const res = await fetch('/api/team/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: preview }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ imported: data.imported, welcomed: data.welcomed })
        router.refresh()
      } else {
        setError(data.error ?? 'Import failed')
      }
    } catch {
      setError('Import failed')
    } finally {
      setImporting(false)
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'paste', label: 'Paste' },
    { key: 'csv', label: 'CSV file' },
    { key: 'sheets', label: 'Google Sheets' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#111113] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[17px] font-bold tracking-[-0.02em]">Import team members</h2>
            <button onClick={onClose} className="text-[#52525b] hover:text-white transition-colors text-lg leading-none p-1">×</button>
          </div>
          <p className="text-xs text-[#71717a]">
            Include columns: <span className="text-[#a1a1aa] font-medium">name</span>, <span className="text-[#a1a1aa] font-medium">email</span> (required), <span className="text-[#a1a1aa] font-medium">team</span>, <span className="text-[#a1a1aa] font-medium">function</span> (optional)
          </p>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex items-center gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setError(null); setResult(null); setPreview([]) }}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                tab === key
                  ? 'bg-white/[0.08] border-white/[0.15] text-white'
                  : 'border-transparent text-[#71717a] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={downloadTemplate}
            className="ml-auto text-[11px] text-accent hover:text-accent/80 transition-colors"
          >
            ↓ Download template
          </button>
        </div>

        {/* Tab content */}
        <div className="px-6 py-4">

          {/* ── Paste tab ─────────────────────────────────────────────── */}
          {tab === 'paste' && (
            <div>
              <p className="text-xs text-[#52525b] mb-2">
                Copy rows from Google Sheets or Excel and paste below. Headers should be in the first row.
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => handlePaste(e.target.value)}
                placeholder={"name\temail\tteam\tfunction\nJane Smith\tjane@company.com\tEngineering\tFrontend Dev"}
                rows={6}
                className="w-full bg-[#09090b] border border-white/10 text-white text-xs font-mono px-3.5 py-3 rounded-lg outline-none focus:border-accent/40 placeholder-[#3f3f46] transition-colors resize-y"
              />
            </div>
          )}

          {/* ── CSV tab ───────────────────────────────────────────────── */}
          {tab === 'csv' && (
            <div>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFile} />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-white/[0.1] hover:border-white/[0.2] rounded-xl py-10 flex flex-col items-center gap-2 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-lg">
                  📄
                </div>
                <p className="text-sm text-[#a1a1aa]">Click to choose a CSV file</p>
                <p className="text-[11px] text-[#52525b]">Accepts .csv, .tsv, or .txt</p>
              </button>
            </div>
          )}

          {/* ── Google Sheets tab ─────────────────────────────────────── */}
          {tab === 'sheets' && (
            <div>
              <p className="text-xs text-[#52525b] mb-2">
                Paste a Google Sheets link. The sheet must be shared as <span className="text-[#a1a1aa]">"Anyone with the link can view"</span>.
              </p>
              <div className="flex gap-2">
                <input
                  value={sheetsUrl}
                  onChange={(e) => setSheetsUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 bg-[#09090b] border border-white/10 text-white text-sm px-3.5 py-2.5 rounded-md outline-none focus:border-accent/40 placeholder-[#3f3f46] transition-colors"
                />
                <button
                  onClick={handleSheetsUrl}
                  disabled={!sheetsUrl.trim() || sheetsLoading}
                  className="bg-white text-black font-semibold text-sm px-4 py-2.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50 shrink-0"
                >
                  {sheetsLoading ? 'Loading…' : 'Fetch'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="px-6 pb-2">
            <p className="text-xs font-medium text-[#a1a1aa] mb-2">
              Preview — {preview.length} member{preview.length !== 1 ? 's' : ''} found
            </p>
            <div className="bg-[#09090b] border border-white/[0.07] rounded-lg overflow-hidden max-h-44 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[#52525b]">
                    <th className="text-left px-3 py-2 font-medium">Name</th>
                    <th className="text-left px-3 py-2 font-medium">Email</th>
                    <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Team</th>
                    <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Function</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((m, i) => (
                    <tr key={i} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-3 py-1.5 text-white">{m.name}</td>
                      <td className="px-3 py-1.5 text-[#a1a1aa]">{m.email}</td>
                      <td className="px-3 py-1.5 text-[#71717a] hidden sm:table-cell">{m.team || '—'}</td>
                      <td className="px-3 py-1.5 text-[#71717a] hidden sm:table-cell">{m.function || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 20 && (
                <p className="text-[11px] text-[#52525b] px-3 py-2">+{preview.length - 20} more</p>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-6 pb-2">
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">{error}</p>
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="px-6 pb-2">
            <p className="text-xs text-accent bg-accent/10 border border-accent/20 px-3 py-2 rounded-md">
              Imported {result.imported} member{result.imported !== 1 ? 's' : ''}
              {result.welcomed > 0 && ` — ${result.welcomed} welcome email${result.welcomed !== 1 ? 's' : ''} sent`}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 border-t border-white/[0.07] flex items-center justify-between">
          <p className="text-[11px] text-[#3f3f46]">Existing emails will be skipped</p>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-sm text-[#71717a] hover:text-white transition-colors">
              {result ? 'Done' : 'Cancel'}
            </button>
            {!result && (
              <button
                onClick={handleImport}
                disabled={preview.length === 0 || importing}
                className="bg-white text-black font-semibold text-sm px-5 py-2.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {importing ? 'Importing…' : `Import ${preview.length} member${preview.length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
