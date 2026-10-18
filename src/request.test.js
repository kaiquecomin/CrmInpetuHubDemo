import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOOKING_DRAFT_KEY, consumeBookingDraft, getProfileMenuRole, getProfileRoleLabel, readBookingDraft, request, saveBookingDraft } from './App.jsx'

describe('profile role labels', () => {
  it.each([
    [1, 'Coordenador'],
    [2, 'Gestor de espaços'],
    [3, 'Atendente'],
    [4, 'Solicitante'],
  ])('labels profile %i as %s', (perfil, label) => {
    expect(getProfileRoleLabel({ perfil })).toBe(label)
  })

  it('does not repeat a role already present in the account name', () => {
    expect(getProfileMenuRole({ nome: 'Coordenador InPETU', perfil: 1 })).toBe('')
    expect(getProfileMenuRole({ nome: 'Ana Silva', perfil: 1 })).toBe('Coordenador')
  })
})

describe('request session handling', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('booking drafts', () => {
    beforeEach(() => sessionStorage.clear())

    it('preserves a booking for the same space until it is restored after login', () => {
      const draftForm = {
        dataReserva: '2026-10-20',
        horarioInicio: '10:00',
        horarioFim: '11:00',
        tituloEvento: 'Oficina',
        descricaoFinalidade: 'Encontro de pesquisa',
      }
      const space = { idEspaco: 17, nomeEspaco: 'Sala multiuso', ativo: true }
      saveBookingDraft(space, draftForm)

      expect(readBookingDraft()).toMatchObject({ spaceId: 17, space, form: draftForm })
      expect(consumeBookingDraft(18)).toBeNull()
      expect(sessionStorage.getItem(BOOKING_DRAFT_KEY)).not.toBeNull()
      expect(consumeBookingDraft('17')).toMatchObject({ spaceId: 17, form: draftForm })
      expect(sessionStorage.getItem(BOOKING_DRAFT_KEY)).toBeNull()
    })

    it('removes an invalid stored draft instead of restoring malformed data', () => {
      sessionStorage.setItem(BOOKING_DRAFT_KEY, '{')

      expect(readBookingDraft()).toBeNull()
      expect(sessionStorage.getItem(BOOKING_DRAFT_KEY)).toBeNull()
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('clears the saved session and reports an expired session on protected 401 responses', async () => {
    localStorage.setItem('inpetu-user', JSON.stringify({ idUsuario: 7 }))
    localStorage.setItem('inpetu-token', 'legacy-token')
    sessionStorage.setItem('inpetu-login-return-view', 'calendar')
    const onExpired = vi.fn()
    window.addEventListener('inpetu-session-expired', onExpired)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      text: async () => JSON.stringify({
        codigo: 'SESSAO_EXPIRADA',
        mensagem: 'Sua sessão expirou. Entre novamente.',
      }),
    }))

    await expect(request('/notificacoes/minhas')).rejects.toMatchObject({
      status: 401,
      message: 'Sua sessão expirou. Entre novamente.',
    })

    expect(localStorage.getItem('inpetu-user')).toBeNull()
    expect(localStorage.getItem('inpetu-token')).toBeNull()
    expect(sessionStorage.getItem('inpetu-login-return-view')).toBeNull()
    expect(onExpired).toHaveBeenCalledTimes(1)
    window.removeEventListener('inpetu-session-expired', onExpired)
  })

  it('does not redirect a signed-out visitor when the optional session probe returns 401', async () => {
    const onExpired = vi.fn()
    window.addEventListener('inpetu-session-expired', onExpired)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      text: async () => JSON.stringify({
        codigo: 'SESSAO_EXPIRADA',
        mensagem: 'Sua sessão expirou. Entre novamente.',
      }),
    }))

    await expect(request('/auth/session')).rejects.toMatchObject({
      status: 401,
      message: 'Sua sessão expirou. Entre novamente.',
    })

    expect(localStorage.getItem('inpetu-user')).toBeNull()
    expect(onExpired).not.toHaveBeenCalled()
    window.removeEventListener('inpetu-session-expired', onExpired)
  })

  it('does not expose a raw Forbidden response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 403,
      ok: false,
      text: async () => 'Forbidden',
    }))

    await expect(request('/auditoria')).rejects.toMatchObject({
      status: 403,
      message: 'Você não tem permissão para esta ação.',
    })
  })

  it('shows a clear rate-limit message and uses Retry-After when provided', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 429,
      ok: false,
      headers: new Headers({ 'Retry-After': '120' }),
      text: async () => JSON.stringify({ mensagem: 'generic server error' }),
    }))

    await expect(request('/auth/esqueci-senha', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      status: 429,
      message: 'Muitas tentativas. Tente novamente em 2 minutos.',
    })
  })

  it('uses a helpful rate-limit message when Retry-After is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 429,
      ok: false,
      headers: new Headers(),
      text: async () => JSON.stringify({ mensagem: 'generic server error' }),
    }))

    await expect(request('/auth/esqueci-senha', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      status: 429,
      message: 'Muitas tentativas. Tente novamente em alguns minutos.',
    })
  })

  it('does not clear the session after rejected login credentials', async () => {
    localStorage.setItem('inpetu-user', JSON.stringify({ idUsuario: 7 }))
    const onExpired = vi.fn()
    window.addEventListener('inpetu-session-expired', onExpired)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      text: async () => JSON.stringify({ mensagem: 'E-mail ou senha incorretos.' }),
    }))

    const error = await request('/auth/login', { method: 'POST', body: '{}' }).catch(value => value)

    expect(error).toBeInstanceOf(Error)
    expect(error.status).toBe(401)
    expect(error.message).toBe('E-mail ou senha incorretos. Confirme que está usando uma conta cadastrada.')
    expect(localStorage.getItem('inpetu-user')).not.toBeNull()
    expect(onExpired).not.toHaveBeenCalled()
    window.removeEventListener('inpetu-session-expired', onExpired)
  })
})
