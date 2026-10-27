import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { SpaceCardAction } from './App.jsx'

const styleElements = []

beforeAll(() => {
  for (const stylesheetPath of ['./reference.css', './design-system.css', './brand-theme.css']) {
    const stylesheet = readFileSync(new URL(stylesheetPath, import.meta.url), 'utf8')
    const style = document.createElement('style')
    style.textContent = stylesheet.replace(/^@import\s+[^;]+;/, '')
    document.head.append(style)
    styleElements.push(style)
  }
})

afterAll(() => styleElements.forEach(style => style.remove()))
afterEach(cleanup)

describe('public space card actions', () => {
  it('renders one primary action per card and routes it according to the space', () => {
    const onConsultSpace = vi.fn()
    const onRequestReservation = vi.fn()
    const onClose = vi.fn()
    const spaces = [
      { idEspaco: 1, nomeEspaco: 'Sala', tipoEspaco: 'Sala de reunião', ativo: true },
      { idEspaco: 2, nomeEspaco: 'Visita', tipoEspaco: 'Visita guiada', ativo: true },
      { idEspaco: 3, nomeEspaco: 'Auditório', tipoEspaco: 'Auditório', ativo: false },
    ]

    render(
      <div className="public-app">
        <section className="spaces-section">
          <div className="space-grid">
            {spaces.map(space => (
              <article className="space-card" key={space.idEspaco}>
                <div className="space-info">
                  <p className="space-description">{space.nomeEspaco}</p>
                  <SpaceCardAction
                    space={space}
                    onConsultSpace={onConsultSpace}
                    onRequestReservation={onRequestReservation}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>,
    )

    const cards = [...document.querySelectorAll('.space-card')]
    expect(cards).toHaveLength(3)
    expect(cards.map(card => card.querySelectorAll('.space-cta').length)).toEqual([1, 1, 1])
    expect(cards.map(card => within(card).getByRole('button').textContent)).toEqual([
      'Ver horários',
      'Solicitar visita',
      'Ver motivo',
    ])

    fireEvent.click(within(cards[0]).getByRole('button'))
    fireEvent.click(within(cards[1]).getByRole('button'))
    fireEvent.click(within(cards[2]).getByRole('button'))

    expect(onConsultSpace.mock.calls.map(([space]) => space.idEspaco)).toEqual([1, 3])
    expect(onRequestReservation).toHaveBeenCalledWith(spaces[1])
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps card actions full-width, equal-height, and anchored at the card bottom', () => {
    render(
      <div className="public-app">
        <section className="spaces-section">
          <div className="space-grid">
            {[1, 2].map(id => (
              <article className="space-card" key={id}>
                <div className="space-info">
                  <p className="space-description">{id === 1 ? 'Descrição curta.' : 'Descrição longa. '.repeat(30)}</p>
                  <button type="button" className="space-cta">Ver horários</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>,
    )

    const cards = [...document.querySelectorAll('.space-card')]
    const cardStyles = styleElements[0].textContent
    expect(cardStyles).toMatch(/body \.public-app \.spaces-section \.space-card\s*\{\s*display:\s*flex;[\s\S]*?flex-direction:\s*column;/)
    expect(cardStyles).toMatch(/body \.public-app \.spaces-section \.space-info\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;/)
    expect(cardStyles).toMatch(/body \.public-app \.spaces-section \.space-description\s*\{[\s\S]*?flex:\s*1 1 auto;/)
    expect(cardStyles).toMatch(/body \.public-app \.spaces-section \.space-info \.space-cta\s*\{[\s\S]*?height:\s*46px;[\s\S]*?width:\s*100%;[\s\S]*?margin-top:\s*auto;/)

    for (const card of cards) {
      expect(card.querySelectorAll('.space-cta')).toHaveLength(1)
    }
  })
})
