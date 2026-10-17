const relativeTimeFormatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

export function formatRelativeNotificationDate(value, now = Date.now()) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'Data indisponível'

  const difference = timestamp - now
  if (Math.abs(difference) < 30_000) return 'agora'

  const units = [
    ['minute', 60_000, 3_600_000],
    ['hour', 3_600_000, 86_400_000],
    ['day', 86_400_000, 604_800_000],
    ['week', 604_800_000, 2_629_746_000],
    ['month', 2_629_746_000, 31_556_952_000],
    ['year', 31_556_952_000, Number.POSITIVE_INFINITY],
  ]
  const [unit, milliseconds] = units.find(([, , upperBound]) => Math.abs(difference) < upperBound)
  const roundedDifference = Math.round(difference / milliseconds)
  return relativeTimeFormatter.format(roundedDifference || Math.sign(difference), unit)
}

export function normalizeNotificationMessage(value) {
  const message = String(value ?? '')
    .replace(/[\u2012\u2013\u2014\u2015]/g, ',')
    .replace(/\s*,\s*/g, ', ')
    .replace(/(?:,\s*){2,}/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')

  return message || 'Sem mensagem disponível.'
}
