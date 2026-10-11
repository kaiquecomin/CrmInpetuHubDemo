export const personas = Object.freeze({
  1: Object.freeze({ label: 'InPETU Hub', quota: null, badge: 'priority-one' }),
  2: Object.freeze({ label: 'UFSC outros', quota: 30, badge: 'priority-two' }),
  3: Object.freeze({ label: 'Ecossistema Sapiens Parque', quota: 20, badge: 'priority-three' }),
  4: Object.freeze({ label: 'Governo, ICTs e 3º setor', quota: 10, badge: 'priority-four' }),
  5: Object.freeze({ label: 'Outros parceiros do InPETU', quota: 10, badge: 'priority-two' }),
  6: Object.freeze({ label: 'Externos', quota: null, badge: 'priority-four' }),
})

export const personaQuotaLabel = persona => persona?.quota == null
  ? 'Sem cota mensal'
  : `Cota mensal: ${persona.quota} h`
