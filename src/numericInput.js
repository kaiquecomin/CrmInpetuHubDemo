// Campo numérico controlado: string vazia continua vazia (nunca NaN), para o Backspace não derrubar a tela.
export function toNumberOrEmpty(rawValue) {
  if (rawValue === '' || rawValue === null || rawValue === undefined) return ''
  const parsed = Number(rawValue)
  return Number.isFinite(parsed) ? parsed : ''
}
