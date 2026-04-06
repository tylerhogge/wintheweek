import { describe, it, expect } from 'vitest'
import {
  cleanEmailBody,
  getWeekStart,
  htmlToPlainText,
  buildReplyToAddress,
  parseSubmissionId,
  createInitialThreadIndex,
} from '@/lib/utils'

describe('Email Utilities', () => {
  describe('cleanEmailBody', () => {
    it('should handle empty body', () => {
      expect(cleanEmailBody('')).toBe('')
    })

    it('should remove signature placeholders', () => {
      // The regex is /\[signature_\d+\]/gi so it only matches digits
      const input = 'This is my email\n[signature_12345]'
      const result = cleanEmailBody(input)
      expect(result).not.toContain('[signature_')
      expect(result).toContain('This is my email')
    })

    it('should remove image attachment references', () => {
      const input = 'Check this out\n[12_Email Signature Banner.png]\n[image.jpg]'
      const result = cleanEmailBody(input)
      expect(result).not.toContain('[')
      expect(result).not.toContain(']')
    })

    it('should remove URLs in angle brackets', () => {
      const input = 'Visit us at <https://example.com>'
      const result = cleanEmailBody(input)
      expect(result).not.toContain('<https')
    })

    it('should stop at quoted reply blocks (Gmail style)', () => {
      const input = `My response here

> On Mon, Mar 27, 2026 at 2:00 PM John wrote:
> This is quoted text
> More quoted text

Some footer`
      const result = cleanEmailBody(input)
      expect(result).toContain('My response here')
      expect(result).not.toContain('This is quoted text')
    })

    it('should stop at single > line if followed by another > line', () => {
      const input = `Content here
> First quoted line
> Second quoted line`
      const result = cleanEmailBody(input)
      expect(result).toContain('Content here')
      expect(result).not.toContain('First quoted line')
    })

    it('should NOT stop at single > line in isolation', () => {
      const input = `Content with a single
> quote in the middle
And more content`
      const result = cleanEmailBody(input)
      // Should keep the line since it's not followed by another > line
      expect(result).toContain('quote in the middle')
    })

    it('should stop at "On [date] wrote:" pattern', () => {
      const input = `My thoughts:

On Mon, Mar 27, 2026 at 2:00 PM someone@example.com wrote:
> Original message here`
      const result = cleanEmailBody(input)
      expect(result).toContain('My thoughts')
      expect(result).not.toContain('Original message')
    })

    it('should stop at Outlook divider (5+ underscores)', () => {
      const input = `Response content

_____
Original Message
From: John`
      const result = cleanEmailBody(input)
      expect(result).toContain('Response content')
      expect(result).not.toContain('Original Message')
    })

    it('should stop at Outlook "From:" header', () => {
      const input = `My reply

From: John Smith <john@example.com>
Sent: Monday, March 27, 2026`
      const result = cleanEmailBody(input)
      expect(result).toContain('My reply')
      expect(result).not.toContain('From: John')
    })

    it('should stop at "-----Original Message-----"', () => {
      const input = `Response

-----Original Message-----
From: Someone
Subject: Something`
      const result = cleanEmailBody(input)
      expect(result).toContain('Response')
      expect(result).not.toContain('Original Message')
    })

    it('should stop at RFC 3676 signature delimiter (--)', () => {
      const input = `My message

--
John Doe
john@example.com`
      const result = cleanEmailBody(input)
      expect(result).toContain('My message')
      expect(result).not.toContain('John Doe')
    })

    it('should stop at Outlook "Sent:" header', () => {
      const input = `Email content

Sent: Monday, March 27, 2026 2:30 PM
To: recipient@example.com`
      const result = cleanEmailBody(input)
      expect(result).toContain('Email content')
      expect(result).not.toContain('Sent:')
    })

    it('should handle body with only signature', () => {
      const input = `--
John Doe
john@example.com
Phone: 555-1234`
      const result = cleanEmailBody(input)
      expect(result.trim().length).toBe(0)
    })

    it('should collapse runs of 4+ blank lines to 3', () => {
      const input = `Content 1




Content 2




Content 3`
      const result = cleanEmailBody(input)
      // The function collapses 4+ newlines to 3 (i.e., \n\n\n)
      expect(result).toMatch(/Content 1\n\n\nContent 2\n\n\nContent 3/)
    })

    it('should trim trailing blank lines', () => {
      const input = `Content here


`
      const result = cleanEmailBody(input)
      expect(result).toBe('Content here')
    })

    it('should preserve multiple paragraphs', () => {
      const input = `Paragraph 1

Paragraph 2

Paragraph 3`
      const result = cleanEmailBody(input)
      expect(result).toContain('Paragraph 1')
      expect(result).toContain('Paragraph 2')
      expect(result).toContain('Paragraph 3')
    })

    it('should handle Outlook multi-line "On" pattern', () => {
      const input = `My response

On Mar 27, 2026, at 2:00 PM, someone wrote:
> Some quoted content`
      const result = cleanEmailBody(input)
      expect(result).toContain('My response')
      expect(result).not.toContain('quoted content')
    })

    it('should remove cid: image references', () => {
      const input = 'Check the image [cid:image001@01D1234AB.5FD8A0C0]'
      const result = cleanEmailBody(input)
      expect(result).not.toContain('[cid:')
    })
  })

  describe('htmlToPlainText', () => {
    it('should handle empty HTML', () => {
      expect(htmlToPlainText('')).toBe('')
    })

    it('should convert <br> to newline', () => {
      const html = 'Line 1<br>Line 2'
      expect(htmlToPlainText(html)).toContain('Line 1')
      expect(htmlToPlainText(html)).toContain('Line 2')
    })

    it('should remove style and script tags', () => {
      const html = 'Content<style>body { color: red; }</style><script>alert("hi")</script>End'
      const result = htmlToPlainText(html)
      expect(result).not.toContain('color: red')
      expect(result).not.toContain('alert')
      expect(result).toContain('Content')
      expect(result).toContain('End')
    })

    it('should convert block elements to newlines', () => {
      const html = '<div>First</div><div>Second</div>'
      const result = htmlToPlainText(html)
      expect(result).toContain('First')
      expect(result).toContain('Second')
    })

    it('should handle unordered lists', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
      const result = htmlToPlainText(html)
      expect(result).toContain('• Item 1')
      expect(result).toContain('• Item 2')
    })

    it('should decode HTML entities', () => {
      const html = 'Price: &quot;$10&quot; &amp; tax'
      const result = htmlToPlainText(html)
      expect(result).toContain('$10')
      expect(result).toContain('&')
    })

    it('should strip all HTML tags', () => {
      const html = '<p>Hello <strong>world</strong> <em>test</em></p>'
      const result = htmlToPlainText(html)
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
      expect(result).toContain('Hello')
      expect(result).toContain('world')
      expect(result).toContain('test')
    })
  })

  describe('buildReplyToAddress', () => {
    it('should build valid reply-to address', () => {
      const submissionId = 'f159bfcc-dead-beef-1234-567890abcdef'
      const domain = 'inbound.wintheweek.co'
      const result = buildReplyToAddress(submissionId, domain)
      expect(result).toMatch(/^reply\+[a-f0-9]{8}@inbound\.wintheweek\.co$/)
    })

    it('should use first 8 hex chars after removing dashes', () => {
      const submissionId = 'f159bfcc-dead-beef-1234-567890abcdef'
      const result = buildReplyToAddress(submissionId, 'test.com')
      expect(result).toBe('reply+f159bfcc@test.com')
    })
  })

  describe('parseSubmissionId', () => {
    it('should extract submission ID from reply-to address', () => {
      const address = 'reply+f159bfcc@inbound.wintheweek.co'
      const result = parseSubmissionId(address)
      expect(result).toBe('f159bfcc')
    })

    it('should return null for invalid address', () => {
      expect(parseSubmissionId('invalid@example.com')).toBeNull()
      expect(parseSubmissionId('noreply@example.com')).toBeNull()
    })
  })

  describe('createInitialThreadIndex', () => {
    it('should create 22-byte base64 string', () => {
      const result = createInitialThreadIndex()
      const buffer = Buffer.from(result, 'base64')
      expect(buffer.length).toBe(22)
    })

    it('should start with version byte 0x01', () => {
      const result = createInitialThreadIndex()
      const buffer = Buffer.from(result, 'base64')
      expect(buffer[0]).toBe(0x01)
    })

    it('should produce different values on each call', () => {
      const result1 = createInitialThreadIndex()
      const result2 = createInitialThreadIndex()
      expect(result1).not.toBe(result2)
    })
  })
})

describe('Week Utilities', () => {
  describe('getWeekStart', () => {
    it('should return a Monday (day 1)', () => {
      const date = new Date('2026-03-25')
      const result = getWeekStart(date)
      expect(result.getDay()).toBe(1) // Monday
    })

    it('should return a Date object', () => {
      const result = getWeekStart()
      expect(result).toBeInstanceOf(Date)
    })

    it('should always return Monday (day 1) regardless of input day', () => {
      // Test with various dates in the same week
      const dates = [
        new Date('2026-03-23'), // Monday
        new Date('2026-03-24'), // Tuesday
        new Date('2026-03-25'), // Wednesday
        new Date('2026-03-26'), // Thursday
        new Date('2026-03-27'), // Friday
      ]

      for (const date of dates) {
        const result = getWeekStart(date)
        expect(result.getDay()).toBe(1) // All should be Monday
      }
    })

    it('should move backwards to find start of current week', () => {
      // Given a date, should return a date that is <= original date
      const date = new Date('2026-03-25')
      const result = getWeekStart(date)
      expect(result.getTime()).toBeLessThanOrEqual(date.getTime() + 86400000) // Allow for timezone offset
    })

    it('should handle leap years correctly', () => {
      // Feb 28, 2024 - should return the previous Monday
      const date = new Date('2024-02-28')
      const result = getWeekStart(date)
      expect(result.getDay()).toBe(1) // Monday
      expect(result).toBeInstanceOf(Date)
    })

    it('should handle year boundary', () => {
      // Jan 1, 2026 - should return a Monday
      const date = new Date('2026-01-01')
      const result = getWeekStart(date)
      expect(result.getDay()).toBe(1) // Monday
    })

    it('should use current date if none provided', () => {
      const result = getWeekStart()
      expect(result).toBeInstanceOf(Date)
      expect(result.getDay()).toBe(1) // Should always be Monday
    })
  })
})
