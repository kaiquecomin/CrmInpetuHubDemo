import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Reveal } from './components.jsx'

const originalIntersectionObserver = Object.getOwnPropertyDescriptor(window, 'IntersectionObserver')

afterEach(() => {
  cleanup()
  if (originalIntersectionObserver) {
    Object.defineProperty(window, 'IntersectionObserver', originalIntersectionObserver)
  } else {
    delete window.IntersectionObserver
  }
})

describe('Reveal', () => {
  it('keeps content visible when IntersectionObserver is unavailable', () => {
    delete window.IntersectionObserver
    const { container } = render(<Reveal><p>Conteúdo público</p></Reveal>)

    expect(screen.getByText('Conteúdo público')).toBeTruthy()
    expect(getComputedStyle(container.firstElementChild).opacity).not.toBe('0')
  })

  it('keeps content visible when observer setup fails', () => {
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: class {
        constructor() {
          throw new Error('observer indisponível')
        }
      },
    })
    const { container } = render(<Reveal><p>Conteúdo público</p></Reveal>)

    expect(screen.getByText('Conteúdo público')).toBeTruthy()
    expect(getComputedStyle(container.firstElementChild).opacity).not.toBe('0')
  })
})
