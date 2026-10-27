import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('public and CRM icon button layout', () => {
  it('keeps icon-only controls square, at least 40px, and centered', () => {
    const stylesheet = readFileSync('src/brand-theme.css', 'utf8')

    expect(stylesheet).toMatch(/\.public-theme-toggle\s*\{[\s\S]*?width:\s*40px;[\s\S]*?min-width:\s*40px;[\s\S]*?height:\s*40px;[\s\S]*?min-height:\s*40px;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;[\s\S]*?border-radius:\s*50%;/)
    expect(stylesheet).toMatch(/\.dialog-panel \.dialog-heading > \.icon-button,[\s\S]*?\.crm-layout :is\([^}]+\)\s*\{[\s\S]*?width:\s*40px;[\s\S]*?height:\s*40px;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;[\s\S]*?border-radius:\s*50%;/)
  })
})
