import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, startOfWeek } from 'date-fns'

// Merge Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Get the Monday of the week containing a given date
export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

// Format a week_start date for display: "March 2–7, 2026"
export function formatWeekRange(weekStart: string | Date): string {
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'MMMM d')}–${format(end, 'd, yyyy')}`
  }
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
}

// ISO date string for week navigation — force UTC to avoid timezone day-shift
export function prevWeekStart(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 7)
  return d.toISOString().slice(0, 10)
}

export function nextWeekStart(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString().slice(0, 10)
}

// Generate initials from a name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n: string): string => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Deterministic colour from a string (for avatars)
const AVATAR_GRADIENTS = [
  'from-violet-500 to-violet-700',
  'from-amber-400 to-orange-500',
  'from-pink-400 to-rose-500',
  'from-sky-400 to-blue-600',
  'from-teal-400 to-emerald-600',
  'from-fuchsia-500 to-purple-700',
]

export function avatarGradient(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

// Strip email reply noise (quoted text, signatures) from an email body
export function cleanEmailBody(raw: string): string {
  const lines = raw.split('\n')
  const cleaned: string[] = []

  for (const line of lines) {
    // Stop at common reply/signature delimiters
    if (
      line.startsWith('> ') ||
      line.startsWith('On ') && line.includes(' wrote:') ||
      line.trim() === '--' ||
      line.includes('From:') && line.includes('@') ||
      line.trim().startsWith('-----Original Message')
    ) break

    cleaned.push(line)
  }

  return cleaned.join('\n').trim()
}

// Build the reply-to address encoding a submission ID.
// Uses just the first 8 hex chars of the UUID so the address stays readable:
//   reply+f159bfcc@inbound.wintheweek.co
export function buildReplyToAddress(submissionId: string, domain: string): string {
  const shortToken = submissionId.replace(/-/g, '').substring(0, 8)
  return `reply+${shortToken}@${domain}`
}

// Parse the short token out of a reply-to address
export function parseSubmissionId(address: string): string | null {
  const match = address.match(/reply\+([^@]+)@/)
  return match ? match[1] : null
}
