import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const stylesheetPaths = [
  './reference.css',
  './design-system.css',
  './brand-theme.css',
  './mural/mural.css',
]
const styleElements = []

beforeAll(() => {
  for (const stylesheetPath of stylesheetPaths) {
    const stylesheet = readFileSync(new URL(stylesheetPath, import.meta.url), 'utf8')
    const style = document.createElement('style')
    style.textContent = stylesheet.replace(/^@import\s+[^;]+;/, '')
    document.head.append(style)
    styleElements.push(style)
  }
})

beforeEach(() => {
  document.body.innerHTML = ''
})

afterAll(() => {
  styleElements.forEach(style => style.remove())
})

describe('checkbox and radio click targets', () => {
  it('keeps panel choice labels content-sized and choice inputs at least 24 pixels', () => {
    document.body.innerHTML = `
      <div class="dialog-panel">
        <form class="form-stack">
          <label class="space-approval-option"><input type="checkbox"><span>Exige aprovação manual</span></label>
          <label class="reset-password-option"><input type="radio" name="password">Gerar automaticamente</label>
          <label class="reset-password-option"><input type="radio" name="password"><span>Definir senha temporária</span></label>
        </form>
      </div>
    `

    const labels = [...document.querySelectorAll('.dialog-panel label')]
    for (const label of labels) {
      const input = label.querySelector('input')
      const inputStyle = getComputedStyle(input)
      const labelStyle = getComputedStyle(label)

      expect(inputStyle.width).toBe('24px')
      expect(inputStyle.height).toBe('24px')
      expect(labelStyle.display).toBe('flex')
      expect(labelStyle.width).toBe('fit-content')
      expect(labelStyle.maxWidth).toBe('100%')
    }
  })

  it('keeps the public Mural consent label content-sized with a 24-pixel checkbox', () => {
    document.body.innerHTML = `
      <div class="dialog-panel">
        <form class="form-stack mural-share-form">
          <label class="mural-image-consent"><input type="checkbox"><span>Autorizo o compartilhamento desta imagem.</span></label>
        </form>
      </div>
    `

    const label = document.querySelector('.mural-image-consent')
    const inputStyle = getComputedStyle(label.querySelector('input'))
    const labelStyle = getComputedStyle(label)

    expect(inputStyle.width).toBe('24px')
    expect(inputStyle.height).toBe('24px')
    expect(labelStyle.display).toBe('flex')
    expect(labelStyle.width).toBe('fit-content')
    expect(labelStyle.maxWidth).toBe('100%')
  })

  it('toggles an option through its label text, not unrelated page space', () => {
    document.body.innerHTML = `
      <label class="space-approval-option"><input type="checkbox"><span>Exige aprovação manual</span></label>
      <button type="button">Ação separada</button>
    `

    const checkbox = document.querySelector('input[type="checkbox"]')
    document.querySelector('.space-approval-option span').click()

    expect(checkbox.checked).toBe(true)

    document.querySelector('button').click()

    expect(checkbox.checked).toBe(true)
  })

  it('changes radio selection through the selected option label', () => {
    document.body.innerHTML = `
      <label class="reset-password-option"><input type="radio" name="password" checked><span>Gerar automaticamente</span></label>
      <label class="reset-password-option"><input type="radio" name="password"><span>Definir senha temporária</span></label>
    `

    const radios = [...document.querySelectorAll('input[type="radio"]')]
    document.querySelectorAll('.reset-password-option span')[1].click()

    expect(radios.map(radio => radio.checked)).toEqual([false, true])
  })

  it('keeps switch click targets at least 24 pixels high', () => {
    document.body.innerHTML = '<div class="crm-layout"><button class="toggle" type="button"><span></span></button></div>'

    const style = getComputedStyle(document.querySelector('.toggle'))

    expect(style.width).toBe('40px')
    expect(style.height).toBe('24px')
  })
})
