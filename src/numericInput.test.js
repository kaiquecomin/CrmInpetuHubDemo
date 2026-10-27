import { describe, expect, it } from 'vitest'
import { toNumberOrEmpty } from './numericInput.js'

describe('toNumberOrEmpty', () => {
  it('mantém vazio ao apagar o campo com Backspace', () => {
    expect(toNumberOrEmpty('')).toBe('')
    expect(toNumberOrEmpty(undefined)).toBe('')
    expect(toNumberOrEmpty(null)).toBe('')
  })

  it('converte dígitos em número', () => {
    expect(toNumberOrEmpty('12')).toBe(12)
    expect(toNumberOrEmpty('0')).toBe(0)
  })

  it('nunca devolve NaN nem Infinity', () => {
    expect(toNumberOrEmpty('abc')).toBe('')
    expect(toNumberOrEmpty('-')).toBe('')
    expect(toNumberOrEmpty('1e999')).toBe('')
  })
})
