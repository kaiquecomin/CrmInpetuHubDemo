import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary.jsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('contains render errors and provides a retry action', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function BrokenPage() {
      throw new Error('render failed')
    }

    render(<ErrorBoundary><BrokenPage /></ErrorBoundary>)

    expect(screen.getByRole('alert').textContent).toContain('A página encontrou um erro inesperado.')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })
})
