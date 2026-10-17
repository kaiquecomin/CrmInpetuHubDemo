import { describe, expect, it } from 'vitest'
import { formatRelativeNotificationDate, normalizeNotificationMessage } from './notifications.js'

describe('notification presentation', () => {
  const now = Date.parse('2025-03-01T12:00:00Z')

  it('formats past and future notification times in Portuguese', () => {
    expect(formatRelativeNotificationDate('2025-03-01T11:59:00Z', now)).toBe('há 1 minuto')
    expect(formatRelativeNotificationDate('2025-03-01T11:59:30Z', now)).toBe('há 1 minuto')
    expect(formatRelativeNotificationDate('2025-03-03T12:00:00Z', now)).toBe('depois de amanhã')
  })

  it('marks invalid dates explicitly', () => {
    expect(formatRelativeNotificationDate('invalid', now)).toBe('Data indisponível')
  })

  it('normalizes legacy dash-separated messages without losing their content', () => {
    expect(normalizeNotificationMessage('Reserva aprovada — dia 10 – sala principal'))
      .toBe('Reserva aprovada, dia 10, sala principal')
    expect(normalizeNotificationMessage('  ')).toBe('Sem mensagem disponível.')
  })
})
