import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyThemePreference, readThemePreference } from './App.jsx'

describe('theme preference when storage is unavailable', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.removeProperty('color-scheme')
    document.body.removeAttribute('data-crm-theme')
  })

  it('falls back to the system theme when reading storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage disabled', 'SecurityError')
    })
    vi.stubGlobal('matchMedia', () => ({ matches: true }))

    expect(readThemePreference()).toBe('dark')
  })

  it('applies the theme even when persisting it throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage disabled', 'SecurityError')
    })

    expect(() => applyThemePreference('dark')).not.toThrow()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(document.body.dataset.crmTheme).toBe('dark')
  })
})
