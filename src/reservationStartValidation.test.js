import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getReservationStartError, getSaoPauloDateTime } from './App.jsx'

describe('reservation start validation in America/Sao_Paulo', () => {
  const now = new Date('2026-10-26T14:30:45.000Z')

  it('derives the local date and rejects past dates and times', () => {
    expect(getSaoPauloDateTime(now)).toEqual({
      date: '2026-10-26',
      time: '11:30',
      dateTime: '2026-10-26T11:30:45',
    })
    expect(getReservationStartError('2026-10-25', '12:00', now)).toBe('A data de início deve ser hoje ou uma data futura.')
    expect(getReservationStartError('2026-10-26', '11:30', now)).toBe('O horário de início não pode estar no passado.')
    expect(getReservationStartError('2026-10-26', '11:31', now)).toBe('')
    expect(getReservationStartError('2026-10-27', '08:00', now)).toBe('')
  })

  it('enforces a date minimum, inline validation, disabled save, and consistent field gaps', () => {
    const source = readFileSync('src/CrmPage.jsx', 'utf8')
    const stylesheet = readFileSync('src/reference.css', 'utf8')

    expect(source).toMatch(/type="date" min=\{reservationEditLocalTime\.date\}/)
    expect(source).toMatch(/type="time" min=\{reservationEditForm\.dataReserva === reservationEditLocalTime\.date \? reservationEditLocalTime\.time : undefined\}/)
    expect(source).toMatch(/disabled=\{reservationEditBusy \|\| Boolean\(reservationEditValidation\)\}/)
    expect(stylesheet).toMatch(/\.reservation-edit-form > label,[\s\S]*?gap:\s*8px;/)
    expect(stylesheet).toMatch(/\.reservation-edit-time-row\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?gap:\s*16px;/)
  })
})
