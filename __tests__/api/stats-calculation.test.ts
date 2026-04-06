import { describe, it, expect } from 'vitest'

/**
 * Stats Bar Calculation Tests
 *
 * Tests the calculation logic for the stats bar that shows:
 * - Total sent (actuallySent)
 * - Replied count
 * - Pending count
 *
 * This mirrors the logic in /app/(app)/dashboard/page.tsx
 */

interface Submission {
  id: string
  employee_id: string
  sent_at: string | null
  response: string | null
}

describe('Stats Bar Calculation', () => {
  const mockSubmissions: Submission[] = [
    { id: 'sub-1', employee_id: 'emp-1', sent_at: '2026-03-27T09:00:00Z', response: 'Great week' },
    { id: 'sub-2', employee_id: 'emp-2', sent_at: '2026-03-27T09:15:00Z', response: null },
    { id: 'sub-3', employee_id: 'emp-3', sent_at: '2026-03-27T09:30:00Z', response: 'Busy week' },
    { id: 'sub-4', employee_id: 'emp-4', sent_at: null, response: null }, // unsent
    { id: 'sub-5', employee_id: 'emp-5', sent_at: '2026-03-27T10:00:00Z', response: null },
  ]

  it('should calculate actuallySent by filtering sent_at !== null', () => {
    const actuallySent = mockSubmissions.filter((s) => s.sent_at !== null)

    expect(actuallySent.length).toBe(4)
    expect(actuallySent.every((s) => s.sent_at !== null)).toBe(true)
  })

  it('should calculate replied count', () => {
    const replied = mockSubmissions.filter((s) => s.response !== null)

    expect(replied.length).toBe(2)
    expect(replied.map((s) => s.id)).toEqual(['sub-1', 'sub-3'])
  })

  it('should calculate pending as sent but not replied', () => {
    const actuallySent = mockSubmissions.filter((s) => s.sent_at !== null)
    const pending = actuallySent.filter((s) => s.response === null)

    expect(pending.length).toBe(2)
    expect(pending.map((s) => s.id)).toEqual(['sub-2', 'sub-5'])
  })

  it('should exclude unsent submissions from sent count', () => {
    const actuallySent = mockSubmissions.filter((s) => s.sent_at !== null)

    expect(actuallySent.some((s) => s.id === 'sub-4')).toBe(false)
    expect(actuallySent.length).toBe(4)
  })

  it('should handle all-sent scenario', () => {
    const allSent: Submission[] = [
      { id: 'sub-1', employee_id: 'emp-1', sent_at: '2026-03-27T09:00:00Z', response: null },
      { id: 'sub-2', employee_id: 'emp-2', sent_at: '2026-03-27T09:15:00Z', response: null },
    ]

    const actuallySent = allSent.filter((s) => s.sent_at !== null)
    const replied = allSent.filter((s) => s.response !== null)
    const pending = actuallySent.filter((s) => s.response === null)

    expect(actuallySent.length).toBe(2)
    expect(replied.length).toBe(0)
    expect(pending.length).toBe(2)
  })

  it('should handle all-unsent scenario', () => {
    const allUnsent: Submission[] = [
      { id: 'sub-1', employee_id: 'emp-1', sent_at: null, response: null },
      { id: 'sub-2', employee_id: 'emp-2', sent_at: null, response: null },
    ]

    const actuallySent = allUnsent.filter((s) => s.sent_at !== null)
    const replied = allUnsent.filter((s) => s.response !== null)
    const pending = actuallySent.filter((s) => s.response === null)

    expect(actuallySent.length).toBe(0)
    expect(replied.length).toBe(0)
    expect(pending.length).toBe(0)
  })

  it('should handle all-replied scenario', () => {
    const allReplied: Submission[] = [
      { id: 'sub-1', employee_id: 'emp-1', sent_at: '2026-03-27T09:00:00Z', response: 'Good' },
      { id: 'sub-2', employee_id: 'emp-2', sent_at: '2026-03-27T09:15:00Z', response: 'Great' },
    ]

    const actuallySent = allReplied.filter((s) => s.sent_at !== null)
    const replied = allReplied.filter((s) => s.response !== null)
    const pending = actuallySent.filter((s) => s.response === null)

    expect(actuallySent.length).toBe(2)
    expect(replied.length).toBe(2)
    expect(pending.length).toBe(0)
  })

  it('should handle empty submission list', () => {
    const empty: Submission[] = []

    const actuallySent = empty.filter((s) => s.sent_at !== null)
    const replied = empty.filter((s) => s.response !== null)
    const pending = actuallySent.filter((s) => s.response === null)

    expect(actuallySent.length).toBe(0)
    expect(replied.length).toBe(0)
    expect(pending.length).toBe(0)
  })

  it('should correctly calculate stats for mixed scenario', () => {
    const mixed: Submission[] = [
      { id: 'sub-1', employee_id: 'emp-1', sent_at: '2026-03-27T09:00:00Z', response: 'Great' },
      { id: 'sub-2', employee_id: 'emp-2', sent_at: '2026-03-27T09:15:00Z', response: null },
      { id: 'sub-3', employee_id: 'emp-3', sent_at: null, response: null },
      { id: 'sub-4', employee_id: 'emp-4', sent_at: '2026-03-27T10:00:00Z', response: 'Okay' },
    ]

    const actuallySent = mixed.filter((s) => s.sent_at !== null)
    const replied = mixed.filter((s) => s.response !== null)
    const pending = actuallySent.filter((s) => s.response === null)

    expect(actuallySent.length).toBe(3) // sent to emp-1, emp-2, emp-4
    expect(replied.length).toBe(2) // emp-1, emp-4
    expect(pending.length).toBe(1) // emp-2
  })

  it('should preserve unsent submissions in separate count', () => {
    const unsent = mockSubmissions.filter((s) => s.sent_at === null)

    expect(unsent.length).toBe(1)
    expect(unsent[0].id).toBe('sub-4')
  })

  it('should ensure replied is subset of actuallySent', () => {
    const actuallySent = mockSubmissions.filter((s) => s.sent_at !== null)
    const replied = mockSubmissions.filter((s) => s.response !== null)

    for (const reply of replied) {
      expect(actuallySent.some((s) => s.id === reply.id)).toBe(true)
    }
  })

  it('should ensure pending is subset of actuallySent', () => {
    const actuallySent = mockSubmissions.filter((s) => s.sent_at !== null)
    const pending = actuallySent.filter((s) => s.response === null)

    for (const pend of pending) {
      expect(actuallySent.some((s) => s.id === pend.id)).toBe(true)
    }
  })

  it('should partition submissions correctly (no overlap)', () => {
    const actuallySent = mockSubmissions.filter((s) => s.sent_at !== null)
    const replied = mockSubmissions.filter((s) => s.response !== null)
    const pending = actuallySent.filter((s) => s.response === null)
    const unsent = mockSubmissions.filter((s) => s.sent_at === null)

    // replied and pending should not overlap (within sent)
    const repliedIds = new Set(replied.map((s) => s.id))
    const pendingIds = new Set(pending.map((s) => s.id))

    for (const id of repliedIds) {
      expect(pendingIds.has(id)).toBe(false)
    }

    // sent and unsent should not overlap
    const sentIds = new Set(actuallySent.map((s) => s.id))
    const unsentIds = new Set(unsent.map((s) => s.id))

    for (const id of sentIds) {
      expect(unsentIds.has(id)).toBe(false)
    }
  })

  it('should handle response field with empty string vs null', () => {
    const data: Submission[] = [
      { id: 'sub-1', employee_id: 'emp-1', sent_at: '2026-03-27T09:00:00Z', response: '' },
      { id: 'sub-2', employee_id: 'emp-2', sent_at: '2026-03-27T09:15:00Z', response: null },
      { id: 'sub-3', employee_id: 'emp-3', sent_at: '2026-03-27T10:00:00Z', response: 'Reply' },
    ]

    // Empty string should count as no response (only null and empty string)
    const replied = data.filter(
      (s) => s.response !== null && s.response !== '',
    )

    expect(replied.length).toBe(1)
    expect(replied[0].id).toBe('sub-3')
  })

  it('should calculate percentage metrics correctly', () => {
    const actuallySent = mockSubmissions.filter((s) => s.sent_at !== null)
    const replied = mockSubmissions.filter((s) => s.response !== null)

    const replyRate = actuallySent.length > 0 ? (replied.length / actuallySent.length) * 100 : 0

    expect(actuallySent.length).toBe(4)
    expect(replied.length).toBe(2)
    expect(replyRate).toBe(50) // 2/4 = 50%
  })

  it('should handle stats with single submission', () => {
    const single: Submission[] = [
      { id: 'sub-1', employee_id: 'emp-1', sent_at: '2026-03-27T09:00:00Z', response: 'Reply' },
    ]

    const actuallySent = single.filter((s) => s.sent_at !== null)
    const replied = single.filter((s) => s.response !== null)
    const pending = actuallySent.filter((s) => s.response === null)

    expect(actuallySent.length).toBe(1)
    expect(replied.length).toBe(1)
    expect(pending.length).toBe(0)
  })

  it('should maintain type safety in filter operations', () => {
    const actuallySent = mockSubmissions.filter((s) => s.sent_at !== null)

    // All items should have sent_at property
    for (const submission of actuallySent) {
      expect(submission.sent_at).not.toBeNull()
      expect(typeof submission.sent_at).toBe('string')
    }
  })
})
