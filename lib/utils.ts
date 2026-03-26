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

// Escape HTML special characters to prevent XSS in email templates
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Strip email reply noise (quoted text, signatures) from an email body
export function cleanEmailBody(raw: string): string {
  // Remove Resend's [signature_XXXXXXXX] placeholders and inline image refs
  let text = raw.replace(/\[signature_\d+\]/gi, '').replace(/\[cid:[^\]]+\]/gi, '')

  // Remove image attachment references like [12_Email Signature Banner...png]
  text = text.replace(/\[\d*_?[^\]]*\.(png|jpg|jpeg|gif|bmp)\]/gi, '')

  // Remove bare URLs in angle brackets (common in signatures)
  text = text.replace(/<https?:\/\/[^>]+>/g, '')

  const lines = text.split('\n')
  const cleaned: string[] = []
  let consecutiveBlanks = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Track consecutive blank lines.
    if (trimmed === '') {
      consecutiveBlanks++
      if (consecutiveBlanks >= 3) break
      // 2 blanks = likely signature boundary, UNLESS the next non-blank
      // line looks like content (bullet, number, continuation paragraph)
      if (consecutiveBlanks >= 2) {
        const nextNonBlank = lines.slice(i + 1).find((l) => l.trim())?.trim()
        if (
          !nextNonBlank ||
          !/^[\d•\-\*\(\)]/.test(nextNonBlank)
        ) {
          break
        }
      }
    } else {
      consecutiveBlanks = 0
    }

    // Stop at quoted reply blocks (Gmail / Apple Mail style)
    if (trimmed.startsWith('> ')) break

    // Stop at "On [date], [name] wrote:" (single or multi-line)
    if (trimmed.startsWith('On ') && (trimmed.endsWith('wrote:') || trimmed.includes(' wrote:'))) break

    // Stop at Outlook horizontal dividers (5+ underscores or dashes)
    if (/^[_\-]{5,}$/.test(trimmed)) break

    // Stop at Outlook quoted header block: "From: Name <email@...>"
    if (/^From:\s*.+@.+/i.test(trimmed)) break

    // Stop at "-----Original Message-----"
    if (/^-{3,}original message-{3,}/i.test(trimmed)) break

    // Stop at bare "--" signature delimiter
    if (trimmed === '--') break

    // Stop at Outlook "Sent: Weekday, ..." header line
    if (/^Sent:\s*\w+,/i.test(trimmed)) {
      if (cleaned.length && cleaned[cleaned.length - 1].trim() === '') cleaned.pop()
      break
    }

    // Stop at likely signature lines: phone numbers, addresses, URLs
    if (/^\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(trimmed)) break
    if (/^\d+\s+\w+\s+(st|street|ave|avenue|way|blvd|rd|road|dr|drive|ln|lane|suite|ste)\b/i.test(trimmed)) break

    cleaned.push(line)
  }

  // Trim trailing blank lines
  while (cleaned.length && cleaned[cleaned.length - 1].trim() === '') cleaned.pop()

  // Trim trailing lines that look like a name/title (signature start without delimiter)
  // e.g. "Jack Cutler\nInvestor\nPelion Venture Partners"
  // Detect: last few lines are short, no punctuation, look like name/title/company
  while (cleaned.length > 1) {
    const last = cleaned[cleaned.length - 1].trim()
    // Short line with no sentence punctuation — likely a signature line
    if (last.length > 0 && last.length <= 60 && !/[.!?:,]/.test(last) && !/^\d/.test(last)) {
      cleaned.pop()
    } else {
      break
    }
  }

  // Trim trailing blank lines again after signature removal
  while (cleaned.length && cleaned[cleaned.length - 1].trim() === '') cleaned.pop()

  return cleaned.join('\n').trim()
}

/**
 * Convert HTML email body to clean plain text.
 * Handles Outlook's verbose HTML with ordered/unordered lists,
 * nested divs/spans, and signature blocks.
 */
export function htmlToPlainText(html: string): string {
  let text = html

  // Remove style and script blocks entirely
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

  // Convert <br> to newline
  text = text.replace(/<br\s*\/?>/gi, '\n')

  // Convert block-level closers to newlines
  text = text.replace(/<\/p>/gi, '\n')
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<\/tr>/gi, '\n')
  text = text.replace(/<\/h[1-6]>/gi, '\n')

  // Handle ordered lists: number each <li> inside <ol>
  let olCounter = 0
  text = text.replace(/<ol[^>]*>/gi, () => { olCounter = 0; return '' })
  text = text.replace(/<\/ol>/gi, '')

  // Handle unordered lists
  text = text.replace(/<ul[^>]*>/gi, '')
  text = text.replace(/<\/ul>/gi, '')

  // For <li>, detect context: if we're inside an <ol>, use numbers; otherwise use "-"
  // Since we've already removed <ol> tags and track counter, we use a simpler approach:
  // Replace all <li> with a placeholder, then handle numbering in a second pass.
  // Actually, let's use a simpler regex-based approach with a callback:
  text = text.replace(/<li[^>]*>/gi, '\n• ')
  text = text.replace(/<\/li>/gi, '')

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&#x27;/g, "'")
  text = text.replace(/&rsquo;/g, "'")
  text = text.replace(/&lsquo;/g, "'")
  text = text.replace(/&rdquo;/g, '\u201D')
  text = text.replace(/&ldquo;/g, '\u201C')
  text = text.replace(/&mdash;/g, '\u2014')
  text = text.replace(/&ndash;/g, '\u2013')
  text = text.replace(/&#\d+;/g, '') // strip remaining numeric entities

  // Clean up whitespace: collapse multiple spaces (but preserve newlines)
  text = text.replace(/[^\S\n]+/g, ' ')

  // Clean up lines: trim each, merge orphaned number lines with their content
  const rawLines = text.split('\n').map((line) => line.trim())
  const merged: string[] = []
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    // If this line is just a number/bullet marker (e.g. "1.", "2)", "•")
    // and the next line has content, merge them
    if (/^(\d+[.):]|•|-)$/.test(line) && i + 1 < rawLines.length && rawLines[i + 1]) {
      merged.push(`${line} ${rawLines[i + 1]}`)
      i++ // skip the next line since we merged it
    } else {
      merged.push(line)
    }
  }

  text = merged.join('\n').replace(/\n{3,}/g, '\n\n')

  return text.trim()
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

/**
 * Generate a fresh 22-byte Thread-Index for a new email conversation.
 * Format: 0x01 (version) | 4-byte FILETIME high word | 16 random bytes
 *
 * When Outlook replies it appends 5 bytes, creating a child Thread-Index
 * that shares the same 22-byte base — which is how Exchange groups all
 * messages in the same conversation.  Each subsequent reply adds 5 more
 * bytes, so the full chain is: base(22) + reply1(5) + reply2(5) + ...
 */
export function createInitialThreadIndex(): string {
  const buf = Buffer.allocUnsafe(22)
  buf[0] = 0x01 // version byte required by Exchange
  // 4-byte high word of FILETIME (100ns intervals since 1601-01-01)
  const filetimeSecs = Math.floor(Date.now() / 1000) + 11644473600
  buf.writeUInt32BE(filetimeSecs & 0xffffffff, 1)
  // 16-byte random conversation GUID
  for (let i = 5; i < 22; i++) buf[i] = Math.floor(Math.random() * 256)
  return buf.toString('base64')
}
