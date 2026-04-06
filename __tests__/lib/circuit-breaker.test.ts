import { describe, it, expect, beforeEach } from 'vitest'
import { withCircuitBreaker, _resetCircuitBreaker } from '@/lib/anthropic'

describe('withCircuitBreaker', () => {
  beforeEach(() => {
    _resetCircuitBreaker()
  })

  it('returns the result when the function succeeds', async () => {
    const { result, fromFallback } = await withCircuitBreaker(
      () => Promise.resolve('success'),
      'fallback',
      5000,
    )
    expect(result).toBe('success')
    expect(fromFallback).toBe(false)
  })

  it('returns fallback when the function throws', async () => {
    const { result, fromFallback } = await withCircuitBreaker(
      () => Promise.reject(new Error('API down')),
      'fallback',
      5000,
    )
    expect(result).toBe('fallback')
    expect(fromFallback).toBe(true)
  })

  it('returns fallback when the function times out', async () => {
    const { result, fromFallback } = await withCircuitBreaker(
      () => new Promise((resolve) => setTimeout(() => resolve('late'), 5000)),
      'fallback',
      50, // 50ms timeout — function takes 5s
    )
    expect(result).toBe('fallback')
    expect(fromFallback).toBe(true)
  })

  it('opens the breaker after 3 consecutive failures', async () => {
    const fail = () => Promise.reject(new Error('fail'))

    // Fail 3 times to trip the breaker
    await withCircuitBreaker(fail, 'fb', 5000)
    await withCircuitBreaker(fail, 'fb', 5000)
    await withCircuitBreaker(fail, 'fb', 5000)

    // 4th call should be blocked immediately (breaker open)
    let fnCalled = false
    const { result, fromFallback } = await withCircuitBreaker(
      () => { fnCalled = true; return Promise.resolve('should not run') },
      'blocked',
      5000,
    )
    expect(fnCalled).toBe(false)
    expect(result).toBe('blocked')
    expect(fromFallback).toBe(true)
  })

  it('resets the breaker after a success', async () => {
    const fail = () => Promise.reject(new Error('fail'))

    // Fail twice (below threshold)
    await withCircuitBreaker(fail, 'fb', 5000)
    await withCircuitBreaker(fail, 'fb', 5000)

    // Succeed — should reset counter
    await withCircuitBreaker(() => Promise.resolve('ok'), 'fb', 5000)

    // Fail twice more — still below threshold
    await withCircuitBreaker(fail, 'fb', 5000)
    await withCircuitBreaker(fail, 'fb', 5000)

    // Should still allow requests (breaker closed, only 2 consecutive failures)
    let fnCalled = false
    await withCircuitBreaker(
      () => { fnCalled = true; return Promise.resolve('ran') },
      'fb',
      5000,
    )
    expect(fnCalled).toBe(true)
  })

  it('returns fallback object for complex types', async () => {
    const fallback = {
      summary: 'Briefing unavailable',
      highlights: [],
      sentiment_score: null,
    }

    const { result, fromFallback } = await withCircuitBreaker(
      () => Promise.reject(new Error('timeout')),
      fallback,
      5000,
    )

    expect(result).toEqual(fallback)
    expect(fromFallback).toBe(true)
  })
})
