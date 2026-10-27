import { describe, expect, it } from 'vitest'
import { formatTimeForDisplay } from './App.jsx'

describe('formatTimeForDisplay', () => {
  it('omits seconds while preserving hours and minutes', () => {
    expect(formatTimeForDisplay('08:00:00')).toBe('08:00')
  })

  it('preserves values that already use hours and minutes', () => {
    expect(formatTimeForDisplay('08:30')).toBe('08:30')
  })

  it('returns an empty string for a missing value', () => {
    expect(formatTimeForDisplay(null)).toBe('')
  })
})
