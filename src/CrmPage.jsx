import { useEffect, useMemo, useRef, useState } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, DoorOpen, Download, Filter, Home as HomeIcon, LayoutDashboard, ListChecks, Mail, MapPin, Menu as MenuIcon, MessageCircle, MoreHorizontal, Plus, Search, ShieldCheck, Users, X } from 'lucide-react'
import { API, Avatar, Button, ClientProfileDialog, CrmTitle, Kpi, LoginInline, Logo, Modal, NotificationCenter, PhoneInput, ProfileDialog, Title, clearStoredUser, formatBrazilianPhone, isGuidedTour, localDateValue, omitPersona, phoneDigits, request, reservationStatusLabel, storeUser, unavailableDeadlineLabel } from './App.jsx'

export default function Crm({ user, setUser, onReturnHome, spaces, setSpaces, reservations, setReservations }) {
  const [section, setSection] = useState('Visão geral')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [profileDetailsOpen, setProfileDetailsOpen] = useState(false)
  const [dashboardDate, setDashboardDate] = useState(localDateValue())
  const [partners, setPartners] = useState([])
  const [clientUsers, setClientUsers] = useState([])
  const [clientProfile, setClientProfile] = useState(null)
  const [registrationCreateOpen, setRegistrationCreateOpen] = useState(false)
  const [registrationCreateBusy, setRegistrationCreateBusy] = useState(false)
  const [registrationCreateError, setRegistrationCreateError] = useState('')
  const [newRegistration, setNewRegistration] = useState({ nomeCompleto: '', email: '', telefone: '', organizacao: '', cargoVinculo: '', senha: '' })
  const [reservationEditTarget, setReservationEditTarget] = useState(null)
  const [reservationEditForm, setReservationEditForm] = useState(null)
  const [reservationEditError, setReservationEditError] = useState('')
  const [reservationEditBusy, setReservationEditBusy] = useState(false)
  const [negotiationTarget, setNegotiationTarget] = useState(null)
  const [negotiationNote, setNegotiationNote] = useState('')
  const [negotiationError, setNegotiationError] = useState('')
  const [negotiationBusy, setNegotiationBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [answer, setAnswer] = useState('')
  const [reservationCancelTarget, setReservationCancelTarget] = useState(null)
  const [reservationCancelReason, setReservationCancelReason] = useState('')
  const [reservationCancelError, setReservationCancelError] = useState('')
  const [reservationCancelBusy, setReservationCancelBusy] = useState(false)
  const [approvingReservationId, setApprovingReservationId] = useState(null)
  const [spaceModal, setSpaceModal] = useState(false)
  const [spaceToDeactivate, setSpaceToDeactivate] = useState(null)
  const [spaceReason, setSpaceReason] = useState('')
  const [spaceReturnDate, setSpaceReturnDate] = useState('')
  const [spaceStatusError, setSpaceStatusError] = useState('')
  const [spaceStatusBusy, setSpaceStatusBusy] = useState(false)
  const [newSpace, setNewSpace] = useState({ nomeEspaco: '', tipoEspaco: '', capacidadePessoas: 1, equipamentosDisponiveis: '' })
  const [spaceImage, setSpaceImage] = useState(null)
  const [spaceImagePreview, setSpaceImagePreview] = useState('')
  const [spaceImageError, setSpaceImageError] = useState('')
  const [spaceCreateBusy, setSpaceCreateBusy] = useState(false)
  const [spaceCreateError, setSpaceCreateError] = useState('')
  const [staff, setStaff] = useState([])
  const [roleTarget, setRoleTarget] = useState(null)
  const [roleSaveBusy, setRoleSaveBusy] = useState(false)
  const [roleSaveError, setRoleSaveError] = useState('')
  const [partnerScope, setPartnerScope] = useState('all')
  const [reservationFiltersOpen, setReservationFiltersOpen] = useState(false)
  const [reservationStatusFilter, setReservationStatusFilter] = useState('Todas')
  const [reservationDateFilter, setReservationDateFilter] = useState('')
  const [reservationSpaceFilter, setReservationSpaceFilter] = useState('')
  const [ticketStatusFilter, setTicketStatusFilter] = useState('Todas')
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [crmDataError, setCrmDataError] = useState('')
  const [auditItems, setAuditItems] = useState([])
  const [auditQuery, setAuditQuery] = useState('')
  const [auditActionFilter, setAuditActionFilter] = useState('Todas')
  const nav = [{ name: 'Visão geral', icon: LayoutDashboard }, { name: 'Reservas', icon: CalendarDays }, { name: 'Cadastros', icon: Users }, { name: 'Espaços', icon: DoorOpen }, { name: 'Atendimento', icon: CircleHelp }, { name: 'Auditoria', icon: ListChecks }, ...(user?.perfil === 1 ? [{ name: 'Equipe', icon: ShieldCheck }] : [])]
  function toggleSidebar() {
    if (window.matchMedia?.('(max-width: 720px)').matches) {
      setMobileSidebarOpen(open => !open)
      return
    }
    setSidebarCollapsed(collapsed => !collapsed)
  }
  const notify = text => { setToast(text); window.setTimeout(() => setToast(''), 3200) }
  useEffect(() => {
    if (!user) return
    Promise.all([request('/reservas'), request('/usuarios'), request('/organizacoes'), request('/duvidas'), request('/auditoria')]).then(([bookings, users, organizations, questions, logs]) => {
      const orgById = new Map(organizations.map(org => [org.idOrganizacao, org]))
      const userById = new Map(users.map(person => [person.idUsuario, person]))
      setReservations(bookings.map(item => ({ ...item, espaco: spaces.find(space => space.idEspaco === item.idEspaco)?.nomeEspaco || 'Espaço InPETU', tipoEspaco: spaces.find(space => space.idEspaco === item.idEspaco)?.tipoEspaco, solicitante: userById.get(item.idSolicitante)?.nomeCompleto || 'Solicitante', telefoneContato: item.telefoneContato || userById.get(item.idSolicitante)?.telefone, persona: userById.get(item.idSolicitante)?.idPersona })))
      setClientUsers(users.filter(person => person.idPerfil === 4).map(person => ({
        ...person,
        organizacao: orgById.get(person.idOrganizacao)?.nomeOrganizacao || 'Não informada',
      })))
      setPartners(users.filter(person => person.idPerfil === 4 && person.ativo && person.idOrganizacao && orgById.get(person.idOrganizacao)?.ativo !== false).map(person => ({ id: person.idOrganizacao, userId: person.idUsuario, name: orgById.get(person.idOrganizacao)?.nomeOrganizacao || person.nomeCompleto, contact: person.nomeCompleto, email: person.email, phone: person.telefone, cargoVinculo: person.cargoVinculo, dataCadastro: person.dataCadastro, ativo: person.ativo, persona: person.idPersona, status: person.idPersona ? 'Persona definida' : 'Aguardando persona' })))
      setStaff(users.filter(person => person.idPerfil < 4))
      setTickets(questions)
      setSelectedTicket(current => questions.find(question => question.idDuvida === current?.idDuvida) || questions[0] || null)
      setAuditItems(logs.map(log => {
        const affectedUser = log.tabelaAfetada === 'usuario' ? userById.get(log.idRegistroAfetado) : null
        const actionLabels = { CADASTRO_CRIADO: 'Criação de cadastro', ALTERACAO_CADASTRO: 'Alteração de cadastro', CLASSIFICACAO: 'Classificação', PERSONA_USO: 'Alteração de persona', ALTERACAO_PERFIL: 'Alteração de perfil', ALTERACAO_STATUS: 'Alteração de status', EXCLUSAO_CADASTRO: 'Exclusão de cadastro', DESCREDENCIAMENTO: 'Descredenciamento', CRIACAO: 'Criação de reserva', EDICAO: 'Edição de reserva', NEGOCIACAO_COTA: 'Negociação de cota', APROVACAO: 'Aprovação', CANCELAMENTO: 'Cancelamento' }
        const detail = log.detalhesAlteracao || ''
        return {
          time: new Date(log.dataHora).toLocaleString('pt-BR'),
          user: userById.get(log.idUsuarioResponsavel)?.nomeCompleto || 'Equipe InPETU',
          action: actionLabels[log.acao] || log.acao.replaceAll('_', ' ').toLowerCase().replace(/^[a-z]/, letter => letter.toUpperCase()),
          target: affectedUser ? `${affectedUser.nomeCompleto} · cadastro #${log.idRegistroAfetado}` : `${log.tabelaAfetada} #${log.idRegistroAfetado ?? ''}`,
          detail: detail || 'Sem detalhes adicionais'
        }
      }))
      setCrmDataError('')
    }).catch(error => {
      setCrmDataError(`Não foi possível carregar os dados do painel. ${error.message}`)
    })
  }, [user, spaces])
  useEffect(() => {
    if (!user) return
    let active = true
    let refreshing = false
    let refreshTimer
    const refreshReservations = async () => {
      if (!active || refreshing) return
      refreshing = true
      try {
        const [bookings, users] = await Promise.all([request('/reservas'), request('/usuarios')])
        if (!Array.isArray(bookings) || !Array.isArray(users)) throw new Error('A API retornou uma lista inválida.')
        if (!active) return
        const userById = new Map(users.map(person => [person.idUsuario, person]))
        setReservations(bookings.map(item => ({
          ...item,
          espaco: spaces.find(space => space.idEspaco === item.idEspaco)?.nomeEspaco || 'Espaço InPETU',
          tipoEspaco: spaces.find(space => space.idEspaco === item.idEspaco)?.tipoEspaco,
          solicitante: userById.get(item.idSolicitante)?.nomeCompleto || 'Solicitante',
          telefoneContato: item.telefoneContato || userById.get(item.idSolicitante)?.telefone,
          persona: userById.get(item.idSolicitante)?.idPersona,
        })))
        setCrmDataError(current => current.startsWith('Não foi possível atualizar as reservas do painel.') ? '' : current)
      } catch (error) {
        if (!active) return
        if (error.status === 401) {
          clearStoredUser()
          setUser(null)
          onReturnHome()
        } else {
          setCrmDataError(current => current || `Não foi possível atualizar as reservas do painel. ${error.message}`)
        }
      } finally {
        refreshing = false
        if (active) {
          window.clearTimeout(refreshTimer)
          refreshTimer = window.setTimeout(refreshReservations, 15_000)
        }
      }
    }
    const refreshNow = () => {
      window.clearTimeout(refreshTimer)
      refreshTimer = undefined
      refreshReservations()
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshNow()
    }
    refreshTimer = window.setTimeout(refreshReservations, 15_000)
    window.addEventListener('focus', refreshNow)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      window.clearTimeout(refreshTimer)
      window.removeEventListener('focus', refreshNow)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [user?.idUsuario, user?.email, spaces])
  async function logout() {
    try {
      await request('/auth/logout', { method: 'POST' })
    } catch (error) {
      notify(`Não foi possível confirmar o encerramento da sessão no servidor. ${error.message}`)
    }
    clearStoredUser()
    setUser(null)
    onReturnHome()
  }
  async function approve(item) {
    if (approvingReservationId !== null) return
    if (item.excedeCota && !item.dataNegociacao) {
      setNegotiationTarget(item)
      setNegotiationNote('')
      setNegotiationError('')
      return
    }
    setApprovingReservationId(item.idReserva)
    try {
      const updated = await request(`/reservas/${item.idReserva}/aprovar`, { method: 'POST' })
      if (updated.statusReserva !== 'Confirmada') throw new Error('A API não confirmou a aprovação da reserva.')
      setReservations(items => items.map(reservation => reservation.idReserva === item.idReserva ? { ...reservation, ...updated } : reservation))
      setAuditItems(items => [{
        time: new Date(updated.dataAprovacao || new Date()).toLocaleString('pt-BR'),
        user: user.nome || 'Equipe InPETU',
        action: 'Aprovação',
        target: `${item.tituloEvento} · reserva #${item.idReserva}`,
        detail: 'Reserva aprovada',
      }, ...items])
      notify('Reserva aprovada e solicitante atualizado.')
    } catch (error) {
      notify(error.message)
    } finally {
      setApprovingReservationId(null)
    }
  }
    function editReservation(item) {
      setReservationEditTarget(item)
      setReservationEditForm({
        tituloEvento: item.tituloEvento,
        descricaoFinalidade: item.descricaoFinalidade || '',
        dataReserva: item.dataReserva,
        horarioInicio: item.horarioInicio,
        horarioFim: item.horarioFim,
        idEspaco: item.idEspaco,
        quantidadeParticipantes: item.quantidadeParticipantes || '',
        telefoneContato: phoneDigits(item.telefoneContato || ''),
      })
      setReservationEditError('')
    }
    async function saveReservationEdit(event) {
      event.preventDefault()
      if (!reservationEditTarget || !reservationEditForm || reservationEditBusy) return
      setReservationEditBusy(true)
      setReservationEditError('')
      try {
        const updated = await request(`/reservas/${reservationEditTarget.idReserva}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...reservationEditForm,
            idEspaco: Number(reservationEditForm.idEspaco),
            telefoneContato: reservationEditForm.telefoneContato || null,
            quantidadeParticipantes: spaces.find(space => space.idEspaco === Number(reservationEditForm.idEspaco))?.tipoEspaco?.toLocaleLowerCase('pt-BR').includes('visita')
              ? Number(reservationEditForm.quantidadeParticipantes)
              : null,
          }),
        })
        const space = spaces.find(item => item.idEspaco === updated.idEspaco)
        const client = clientUsers.find(item => item.idUsuario === updated.idSolicitante)
        const normalized = { ...updated, espaco: space?.nomeEspaco || 'Espaço InPETU', tipoEspaco: space?.tipoEspaco, solicitante: client?.nomeCompleto || reservationEditTarget.solicitante, persona: client?.idPersona }
        setReservations(items => items.map(item => item.idReserva === updated.idReserva ? normalized : item))
        setAuditItems(items => [{ time: new Date().toLocaleString('pt-BR'), user: user.nome, action: 'Edição de reserva', target: `${updated.tituloEvento} · reserva #${updated.idReserva}`, detail: 'Alterações salvas pela equipe.' }, ...items])
        setReservationEditTarget(null)
        setReservationEditForm(null)
        notify(updated.excedeCota ? 'Reserva atualizada. A negociação da cota precisa ser revisada.' : 'Reserva atualizada e auditada.')
      } catch (error) {
        setReservationEditError(error.message)
      } finally {
        setReservationEditBusy(false)
      }
    }
    async function recordNegotiationAndApprove() {
      if (!negotiationTarget || !negotiationNote.trim() || negotiationBusy) return
      setNegotiationBusy(true)
      setNegotiationError('')
      try {
        const negotiated = await request(`/reservas/${negotiationTarget.idReserva}/negociacao`, {
          method: 'PATCH',
          body: JSON.stringify({ observacao: negotiationNote.trim() }),
        })
        setReservations(items => items.map(item => item.idReserva === negotiated.idReserva ? { ...item, ...negotiated } : item))
        setNegotiationTarget(null)
        setNegotiationNote('')
        await approve({ ...negotiationTarget, ...negotiated })
      } catch (error) {
        setNegotiationError(error.message)
      } finally {
        setNegotiationBusy(false)
      }
    }
  async function cancelReservationByTeam() {
    if (!reservationCancelTarget || !reservationCancelReason.trim() || reservationCancelBusy) return
    setReservationCancelBusy(true)
    setReservationCancelError('')
    try {
      const updated = await request(`/reservas/${reservationCancelTarget.idReserva}/cancelar`, {
        method: 'DELETE',
        body: JSON.stringify({ motivoCancelamento: reservationCancelReason.trim() }),
      })
      if (updated.statusReserva !== 'Cancelada') throw new Error('A API não confirmou o cancelamento da reserva.')
      const target = reservationCancelTarget
      setReservations(items => items.map(item => item.idReserva === target.idReserva
        ? { ...item, ...updated, motivoCancelamento: reservationCancelReason.trim() }
        : item))
      setAuditItems(items => [{
        time: new Date().toLocaleString('pt-BR'),
        user: user.nome || 'Equipe InPETU',
        action: 'Cancelamento',
        target: `${target.tituloEvento} · reserva #${target.idReserva}`,
        detail: reservationCancelReason.trim(),
      }, ...items])
      setReservationCancelTarget(null)
      setReservationCancelReason('')
      notify('Reserva cancelada. Solicitante e equipe foram notificados.')
    } catch (error) {
      setReservationCancelError(error.message)
    } finally {
      setReservationCancelBusy(false)
    }
  }
  async function deactivateClient(client, motivo) {
    const updated = await request(`/usuarios/${client.idUsuario}/cadastro`, {
      method: 'DELETE',
      body: JSON.stringify({ motivo: motivo.trim() }),
    })
    setPartners(items => items.filter(partner => partner.userId !== updated.idUsuario))
    setClientUsers(items => items.map(person => person.idUsuario === updated.idUsuario ? updated : person))
    setClientProfile(null)
    setAuditItems(items => [{
      time: new Date().toLocaleString('pt-BR'),
      user: user.nome || 'Equipe InPETU',
      action: 'Desativação de cadastro',
      target: `${client.nomeCompleto} · cadastro #${client.idUsuario}`,
      detail: motivo.trim(),
    }, ...items])
    notify('Cadastro desativado. O histórico foi preservado.')
  }
  async function createRegistration(event) {
    event.preventDefault()
    if (registrationCreateBusy) return
    setRegistrationCreateBusy(true)
    setRegistrationCreateError('')
    try {
      const created = await request('/usuarios/cadastros', {
        method: 'POST',
        body: JSON.stringify({
          ...newRegistration,
          nomeCompleto: newRegistration.nomeCompleto.trim(),
          email: newRegistration.email.trim(),
          telefone: newRegistration.telefone.trim(),
          organizacao: newRegistration.organizacao.trim(),
          cargoVinculo: newRegistration.cargoVinculo.trim(),
          senha: newRegistration.senha,
        }),
      })
      setPartners(items => [{
        id: created.idOrganizacao,
        userId: created.idUsuario,
        name: newRegistration.organizacao.trim(),
        contact: created.nomeCompleto,
        email: created.email,
        persona: created.idPersona,
        status: 'Aguardando persona',
      }, ...items])
      setClientUsers(items => [{ ...created, organizacao: newRegistration.organizacao.trim() }, ...items])
      setNewRegistration({ nomeCompleto: '', email: '', telefone: '', organizacao: '', cargoVinculo: '', senha: '' })
      setRegistrationCreateOpen(false)
      notify('Cadastro criado e registrado na auditoria.')
    } catch (error) {
      setRegistrationCreateError(error.message)
    } finally {
      setRegistrationCreateBusy(false)
    }
  }
  async function saveClientPersona(client, persona) {
    const updated = await request(`/usuarios/${client.idUsuario}/persona`, {
      method: 'PUT',
      body: JSON.stringify({ idPersona: Number(persona) }),
    })
    const normalized = { ...client, ...updated, organizacao: client.organizacao }
    setPartners(items => items.map(person => person.userId === updated.idUsuario
      ? { ...person, status: 'Persona definida', persona: updated.idPersona }
      : person))
    setClientUsers(items => items.map(person => person.idUsuario === updated.idUsuario ? normalized : person))
    setClientProfile(normalized)
    setReservations(items => items.map(item => item.idSolicitante === updated.idUsuario
      ? { ...item, persona: updated.idPersona }
      : item))
    setAuditItems(items => [{
      time: new Date().toLocaleString('pt-BR'),
      user: user.nome || 'Equipe InPETU',
      action: 'Alteração de persona',
      target: `${client.nomeCompleto} · cadastro #${client.idUsuario}`,
      detail: `Persona alterada para P${updated.idPersona}.`,
    }, ...items])
    notify('Persona de uso atualizada e registrada na auditoria.')
    return normalized
  }
  async function saveClientProfile(client, form) {
    const updated = await request(`/usuarios/${client.idUsuario}/cadastro`, {
      method: 'PUT',
      body: JSON.stringify({
        ...form,
        nomeCompleto: form.nomeCompleto.trim(),
        email: form.email.trim(),
        telefone: form.telefone.trim(),
        organizacao: form.organizacao.trim(),
        cargoVinculo: form.cargoVinculo.trim(),
      }),
    })
    const normalized = { ...updated, organizacao: form.organizacao.trim() }
    setClientUsers(items => items.map(person => person.idUsuario === updated.idUsuario
      ? normalized
      : person.idOrganizacao === updated.idOrganizacao
        ? { ...person, organizacao: normalized.organizacao }
      : person))
    setClientProfile(normalized)
    setPartners(items => items.map(person => ({
      ...person,
      ...(person.id === updated.idOrganizacao ? { name: normalized.organizacao } : {}),
      ...(person.userId === updated.idUsuario
        ? { contact: updated.nomeCompleto, email: updated.email, phone: updated.telefone }
        : {}),
    })))
    setReservations(items => items.map(item => item.idSolicitante === updated.idUsuario
      ? { ...item, solicitante: updated.nomeCompleto }
      : item))
    setTickets(items => items.map(ticket => ticket.emailContato?.toLowerCase() === client.email?.toLowerCase()
      ? { ...ticket, emailContato: updated.email }
      : ticket))
    setAuditItems(items => [{
      time: new Date().toLocaleString('pt-BR'),
      user: user.nome || 'Equipe InPETU',
      action: 'Alteração de cadastro',
      target: `${updated.nomeCompleto} · cadastro #${updated.idUsuario}`,
      detail: 'Dados cadastrais e organização compartilhada atualizados.',
    }, ...items])
    notify('Dados do cadastro atualizados e registrados na auditoria.')
    return normalized
  }
  function resetSpaceForm() {
    if (spaceImagePreview) URL.revokeObjectURL(spaceImagePreview)
    setSpaceImage(null)
    setSpaceImagePreview('')
    setSpaceImageError('')
    setSpaceCreateError('')
    setNewSpace({ nomeEspaco: '', tipoEspaco: '', capacidadePessoas: 1, equipamentosDisponiveis: '' })
  }
  function closeSpaceModal() {
    if (spaceCreateBusy) return
    setSpaceModal(false)
    resetSpaceForm()
  }
  function selectSpaceImage(file) {
    if (spaceImagePreview) URL.revokeObjectURL(spaceImagePreview)
    if (file && !['image/png', 'image/jpeg'].includes(file.type)) {
      setSpaceImage(null)
      setSpaceImagePreview('')
      setSpaceImageError('Escolha uma imagem PNG ou JPG.')
      return
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setSpaceImage(null)
      setSpaceImagePreview('')
      setSpaceImageError('A imagem deve ter até 5 MB.')
      return
    }
    setSpaceImage(file || null)
    setSpaceImagePreview(file ? URL.createObjectURL(file) : '')
    setSpaceImageError('')
    setSpaceCreateError('')
  }
  async function addSpace(event) {
    event.preventDefault()
    if (spaceCreateBusy) return
    setSpaceCreateBusy(true)
    setSpaceCreateError('')
    const form = new FormData()
    form.append('nomeEspaco', newSpace.nomeEspaco.trim())
    form.append('tipoEspaco', newSpace.tipoEspaco.trim())
    form.append('capacidadePessoas', String(newSpace.capacidadePessoas))
    form.append('equipamentosDisponiveis', newSpace.equipamentosDisponiveis.trim())
    if (spaceImage) form.append('imagem', spaceImage)
    try {
      const created = await request('/espacos', { method: 'POST', body: form })
      setSpaces(items => [...items, created])
      setSpaceModal(false)
      resetSpaceForm()
      notify('Novo espaço adicionado ao catálogo.')
    } catch (error) {
      setSpaceCreateError(error.message)
    } finally {
      setSpaceCreateBusy(false)
    }
  }
  function toggleSpace(space) {
    if (space.ativo !== false) {
      setSpaceToDeactivate(space)
      setSpaceReason('')
      setSpaceReturnDate('')
      setSpaceStatusError('')
      return
    }
    updateSpaceStatus(space, true)
  }
  async function updateSpaceStatus(space, ativo, motivoIndisponibilidade = '', dataPrevisaoRetorno = null) {
    setSpaceStatusBusy(true)
    setSpaceStatusError('')
    try {
      const updated = await request(`/espacos/${space.idEspaco}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo, motivoIndisponibilidade, dataPrevisaoRetorno }),
      })
      setSpaces(items => items.map(item => item.idEspaco === space.idEspaco ? updated : item))
      setSpaceToDeactivate(null)
      setSpaceReason('')
      setSpaceReturnDate('')
      notify(ativo ? 'Espaço reativado no catálogo.' : 'Espaço marcado como indisponível.')
    } catch (error) {
      if (spaceToDeactivate) setSpaceStatusError(error.message)
      else notify(error.message)
    } finally {
      setSpaceStatusBusy(false)
    }
  }
  async function saveRole() {
    if (!roleTarget) return
    setRoleSaveBusy(true)
    setRoleSaveError('')
    try {
      const updated = await request(`/usuarios/${roleTarget.idUsuario}/perfil`, { method: 'PATCH', body: JSON.stringify({ idPerfil: Number(roleTarget.idPerfil) }) })
      setStaff(items => items.map(person => person.idUsuario === updated.idUsuario ? updated : person))
      notify('Permissões da equipe atualizadas.')
      setRoleTarget(null)
    } catch (error) {
      setRoleSaveError(error.message)
    } finally {
      setRoleSaveBusy(false)
    }
  }
  function exportPartners() {
    const rows = [['Organização', 'Responsável', 'E-mail']]
    filteredPartners.forEach(person => rows.push([person.name, person.contact, person.email]))
    const csv = `\uFEFF${rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'cadastros-inpetu.csv'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function sendAnswer() { if (!answer.trim() || !selectedTicket) return; try { await request(`/duvidas/${selectedTicket.idDuvida}/responder`, { method: 'POST', body: JSON.stringify({ resposta: answer }) }); setTickets(items => items.map(ticket => ticket.idDuvida === selectedTicket.idDuvida ? { ...ticket, respostaEquipe: answer, statusAtendimento: 'Respondida' } : ticket)); setSelectedTicket(current => current?.idDuvida === selectedTicket.idDuvida ? { ...current, respostaEquipe: answer, statusAtendimento: 'Respondida' } : current); setAnswer(''); notify('Resposta registrada no chamado.') } catch (error) { notify(error.message) } }
  const pending = reservations.filter(item => item.statusReserva === 'Pendente')
  const filteredReservations = reservations.filter(item =>
    (reservationStatusFilter === 'Todas' || (reservationStatusFilter === 'Excede cota' ? item.excedeCota : item.statusReserva === reservationStatusFilter)) &&
    (!reservationDateFilter || item.dataReserva === reservationDateFilter) &&
    (!reservationSpaceFilter || String(item.idEspaco) === reservationSpaceFilter)
  )
  const today = new Date()
  const todayKey = localDateValue(today)
  const selectedDay = new Date(`${dashboardDate}T12:00:00`)
  const selectedDateLabel = selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).toLocaleUpperCase('pt-BR')
  const selectedReservations = reservations.filter(item => item.dataReserva === dashboardDate && item.statusReserva !== 'Cancelada').sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio))
  const selectedPending = selectedReservations.filter(item => item.statusReserva === 'Pendente')
  const activeSpaces = spaces.filter(space => space.ativo !== false)
  const occupiedSpaces = new Set(selectedReservations.map(item => item.idEspaco))
  const occupancyRate = activeSpaces.length ? Math.round((occupiedSpaces.size / activeSpaces.length) * 100) : 0
  function shiftDashboardDate(days) {
    const nextDate = new Date(`${dashboardDate}T12:00:00`)
    nextDate.setDate(nextDate.getDate() + days)
    setDashboardDate(localDateValue(nextDate))
  }
  const isDashboardToday = dashboardDate === todayKey
  const pendingQuestions = tickets.filter(ticket => ticket.statusAtendimento !== 'Respondida')
  const filteredPartners = partners.filter(p =>
    (partnerScope === 'all' || !p.persona) &&
    `${p.name} ${p.contact} ${p.email}`.toLowerCase().includes(search.toLowerCase())
  )
  const filteredTickets = tickets.filter(ticket =>
    ticketStatusFilter === 'Todas' ||
    (ticketStatusFilter === 'Abertas' ? ticket.statusAtendimento !== 'Respondida' : ticket.statusAtendimento === 'Respondida')
  )
  const filteredAuditItems = auditItems.filter(item =>
    (auditActionFilter === 'Todas' || item.action === auditActionFilter) &&
    `${item.time} ${item.user} ${item.action} ${item.target} ${item.detail}`.toLowerCase().includes(auditQuery.trim().toLowerCase())
  )
  const auditActions = [...new Set(auditItems.map(item => item.action))]
  if (!user) return <div className="crm-login"><div className="crm-login-visual"><Logo variant="institutionalDark" /><div><Title as="h1">O ecossistema,<br /><em>em movimento.</em></Title><p>Gestão inteligente dos encontros e espaços do Lote 73.</p><div className="crm-location"><MapPin size={17} />Sapiens Parque · Florianópolis</div></div><small>AMBIENTE DE GESTÃO INTERNA</small></div><div className="crm-login-form"><button type="button" className="crm-return-home" onClick={onReturnHome}><ArrowLeft size={16} /> Voltar ao site inicial</button><Title as="h2">Acesso ao painel</Title><p>Entre com sua conta da equipe para gerenciar reservas, espaços e cadastros.</p><LoginInline onLogin={setUser} /></div></div>
  return <div className={`crm-layout ${sidebarCollapsed ? 'crm-sidebar-collapsed' : ''} ${mobileSidebarOpen ? 'crm-mobile-sidebar-open' : ''}`}><button type="button" className="crm-sidebar-backdrop" aria-label="Fechar menu lateral" onClick={() => setMobileSidebarOpen(false)} /><aside className="crm-sidebar"><button type="button" className="crm-logo-button" aria-label={'Vis\u00e3o geral'} onClick={() => setSection('Visão geral')}><Logo variant={sidebarCollapsed ? 'compactDark' : 'horizontalDark'} /></button><div className="workspace-label">ESPAÇO DE TRABALHO</div><nav className="crm-nav">{nav.map(({ name, icon: Icon }) => <button type="button" key={name} aria-label={name} className={section === name ? 'crm-nav-active' : ''} onClick={() => { setSection(name); setMobileSidebarOpen(false) }} ><Icon size={18} /><span>{name}</span>{name === 'Reservas' && pending.length > 0 && <b>{pending.length}</b>}</button>)}</nav><div className="sidebar-spacer" /><button type="button" className="crm-return-home crm-sidebar-return" aria-label="Voltar ao site inicial" onClick={onReturnHome}><HomeIcon size={16} /> Voltar ao site inicial</button><div className="sidebar-help"><span><CircleHelp size={17} /></span><strong>Chamados de usuários</strong><small>Acompanhe e responda pedidos de suporte.</small><button onClick={() => { setSection('Atendimento'); setSelectedTicket(pendingQuestions[0] || tickets[0] || null) }}>Abrir chamados <ArrowRight size={14} /></button></div><Menu as="div" className="crm-profile-menu"><MenuButton type="button" className="profile-button" aria-label={`Perfil de ${user.nome || 'Equipe InPETU'}`}><Avatar user={user} tamanho={38} /><span><strong>{user.nome || 'Equipe InPETU'}</strong><small>{user.perfil === 1 ? 'Coordenador' : user.perfil === 2 ? 'Gestor de espaços' : 'Atendimento'}</small></span><MoreHorizontal size={18} aria-hidden="true" /></MenuButton><MenuItems className="crm-profile-menu-items"><MenuItem><button type="button" onClick={onReturnHome}><HomeIcon size={15} /> Voltar ao site</button></MenuItem><MenuItem><button type="button" onClick={logout}><DoorOpen size={15} /> Sair da conta</button></MenuItem></MenuItems></Menu></aside>
    <main className="crm-main"><header className="crm-topbar"><button type="button" className="crm-sidebar-toggle" aria-label="Alternar menu lateral" aria-expanded={window.matchMedia?.('(max-width: 720px)').matches ? mobileSidebarOpen : !sidebarCollapsed} onClick={toggleSidebar}><MenuIcon size={19} /></button><div className="breadcrumbs"><span>InPETU Connect</span><span>/</span><strong>{section}</strong></div><label className="global-search"><Search size={16} /><input placeholder="Buscar em tudo" value={search} onChange={e => setSearch(e.target.value)} /><kbd>⌘ K</kbd></label><NotificationCenter user={user} /><button type="button" className="crm-icon" aria-label="Ajuda" onClick={() => setHelpOpen(true)}><CircleHelp size={18} /></button><Menu as="div" className="crm-topbar-profile"><MenuButton type="button" className="crm-avatar" aria-label={`Perfil de ${user.nome || 'usuário'}`}><Avatar user={user} tamanho={36} /></MenuButton><MenuItems className="crm-profile-menu-items crm-topbar-profile-items"><MenuItem><button type="button" onClick={() => setProfileDetailsOpen(true)}>Meu perfil</button></MenuItem><MenuItem><button type="button" onClick={onReturnHome}><HomeIcon size={15} /> Voltar ao site</button></MenuItem><MenuItem><button type="button" onClick={logout}><DoorOpen size={15} /> Sair da conta</button></MenuItem></MenuItems></Menu></header>
      <Modal open={helpOpen} close={() => setHelpOpen(false)} title="Ajuda do painel"><p className="access-intro">Use o menu lateral para acessar visão geral, reservas, cadastros, espaços, atendimento e auditoria.</p><p className="access-intro">Para consultar dúvidas enviadas pelos usuários e responder chamados, abra a área de Atendimento.</p><Button onClick={() => { setSection('Atendimento'); setHelpOpen(false) }}>Abrir atendimento <ArrowRight size={16} /></Button></Modal>
      <ProfileDialog open={profileDetailsOpen} close={() => setProfileDetailsOpen(false)} user={user} onUserUpdate={updated => { const next = omitPersona({ ...user, ...updated }); storeUser(next); setUser(next); setStaff(items => items.map(person => person.idUsuario === next.idUsuario ? { ...person, ...updated } : person)); setClientUsers(items => items.map(person => person.idUsuario === next.idUsuario ? { ...person, ...updated } : person)) }} />
      <div className="crm-content">{crmDataError && <div className="form-message" role="alert">{crmDataError}</div>}{section === 'Visão geral' && <><div className="crm-greeting"><div><Title as="h1">Bom dia, {user.nome?.split(' ')[0] || 'equipe'}</Title><p>{isDashboardToday ? 'O Lote 73 está em movimento. Veja o que precisa de atenção.' : 'Visualizando reservas e ocupação desta data.'}</p></div><div className="date-navigation" aria-label="Navegação da agenda"><button type="button" className="date-step" aria-label="Dia anterior" onClick={() => shiftDashboardDate(-1)}><ChevronLeft size={16} /></button><label className="date-button"><CalendarDays size={16} /><span>{isDashboardToday ? 'Hoje · ' : ''}{selectedDay.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}</span><input aria-label="Selecionar data da agenda" type="date" value={dashboardDate} onChange={event => setDashboardDate(event.target.value)} /></label><button type="button" className="date-step" aria-label="Próximo dia" onClick={() => shiftDashboardDate(1)}><ChevronRight size={16} /></button>{!isDashboardToday && <button type="button" className="date-today" onClick={() => setDashboardDate(todayKey)}>Hoje</button>}</div></div><div className="kpi-grid"><Kpi icon={CalendarDays} label="Reservas no dia" value={String(selectedReservations.length).padStart(2, '0')} change={`${occupiedSpaces.size} espaços com agenda nesta data`} accent="mint" /><Kpi icon={Clock3} label="Aguardando aprovação" value={String(pending.length).padStart(2, '0')} change="Precisam da sua atenção" accent="yellow" /><Kpi icon={DoorOpen} label="Ocupação do Lote 73" value={`${occupancyRate}%`} change={`${occupiedSpaces.size} de ${activeSpaces.length} espaços ocupados nesta data`} accent="blue" /><Kpi icon={MessageCircle} label="Dúvidas em aberto" value={String(pendingQuestions.length).padStart(2, '0')} change={`${tickets.length} chamados recebidos`} accent="coral" /></div><div className="dashboard-columns"><section className="crm-panel conflict-panel"><div className="panel-heading"><div><Title as="h2">Solicitações pendentes <span className="heading-count">{selectedPending.length}</span></Title></div><button className="subtle-action" onClick={() => setSection('Reservas')}>Ver todas <ArrowRight size={15} /></button></div>{selectedPending.length ? selectedPending.map(item => <div className="conflict-card" key={item.idReserva}><div className="conflict-card-top"><span className="conflict-icon"><CalendarDays size={16} /></span><span className="conflict-date">{new Date(`${item.dataReserva}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase()} · {item.horarioInicio}-{item.horarioFim}</span><span className="pending-indicator">EM ANÁLISE</span></div><strong>{item.tituloEvento}</strong><div className="conflict-meta"><span>{item.espaco}</span><span className="meta-dot" />{item.solicitante}</div>{item.telefoneContato && <small className="reservation-contact-inline">Contato: {formatBrazilianPhone(item.telefoneContato)}</small>}<div className="conflict-actions"><button className="decision-button" disabled={approvingReservationId !== null} onClick={() => approve(item)}><Check size={15} /> {approvingReservationId === item.idReserva ? 'Aprovando...' : 'Aprovar solicitação'}</button><button className="decision-secondary" onClick={() => notify('Solicite um motivo antes de recusar esta reserva.')}>Recusar</button></div></div>) : <div className="empty-inline"><Check size={18} />Nenhuma solicitação pendente nesta data.</div>}</section><section className="crm-panel today-panel"><div className="panel-heading"><div><Title as="h2">Agenda do dia</Title></div><button className="icon-button" onClick={() => setSection('Reservas')} aria-label="Abrir agenda"><ArrowUpRight size={18} /></button></div>  <div className="day-timeline">{selectedReservations.map(item => <div className="timeline-event" key={item.idReserva}><span>{item.horarioInicio}</span><i className={`timeline-mark ${item.statusReserva === 'Pendente' ? 'pendente' : ''}`} /><div><strong>{item.tituloEvento}</strong><small>{item.espaco || 'Espaço InPETU'} · {item.statusReserva}</small></div></div>)}{selectedReservations.length === 0 && <div className="empty-inline">Nenhuma reserva nesta data.</div>}</div><button className="full-width-link" onClick={() => setSection('Reservas')}>Abrir agenda completa <ArrowRight size={15} /></button></section></div><section className="crm-panel recent-panel"><div className="panel-heading"><div><Title as="h2">Cadastros recentes</Title></div><button className="subtle-action" onClick={() => setSection('Cadastros')}>Gerenciar cadastros <ArrowRight size={15} /></button></div><table className="data-table"><thead><tr><th>Organização</th><th>Contato principal</th><th>Cadastro</th><th>Classificação</th><th /></tr></thead><tbody>{partners.slice(0, 3).map(p => <tr key={p.id}><td><strong>{p.name}</strong><small>{p.email}</small></td><td>{p.contact}</td><td>Hoje · 09:42</td><td>{p.persona ? 'Classificado' : 'Aguardando classificação'}</td><td><button className="table-more" onClick={() => setClientProfile(clientUsers.find(person => person.idUsuario === p.userId) || null)}><MoreHorizontal size={19} /></button></td></tr>)}</tbody></table></section></>}
        {section === 'Reservas' && <>
          <CrmTitle title="Reservas" description="Revise solicitações e acompanhe a ocupação dos espaços." />
          <div className="crm-panel">
            <div className="panel-heading"><div><Title as="h2">{pending.length} solicitações pendentes</Title></div><button type="button" className="subtle-action" aria-expanded={reservationFiltersOpen} onClick={() => setReservationFiltersOpen(value => !value)}><Filter size={15} /> {reservationFiltersOpen ? 'Ocultar filtros' : 'Filtrar'}</button></div>
            {reservationFiltersOpen && <div className="crm-filter-panel" aria-label="Filtros de reservas"><label>Status<select value={reservationStatusFilter} onChange={event => setReservationStatusFilter(event.target.value)}><option>Todas</option><option>Pendente</option><option>Confirmada</option><option>Cancelada</option><option>Excede cota</option></select></label><label>Data<input type="date" value={reservationDateFilter} onChange={event => setReservationDateFilter(event.target.value)} /></label><label>Espaço<select value={reservationSpaceFilter} onChange={event => setReservationSpaceFilter(event.target.value)}><option value="">Todos os espaços</option>{spaces.map(space => <option key={space.idEspaco} value={space.idEspaco}>{space.nomeEspaco}</option>)}</select></label><button type="button" className="table-action" onClick={() => { setReservationStatusFilter('Todas'); setReservationDateFilter(''); setReservationSpaceFilter('') }}>Limpar filtros</button></div>}
            <div className="crm-filter-count">{filteredReservations.length} de {reservations.length} reservas</div>
            <div className="crm-reservations">{filteredReservations.map(item => {
              const day = item.dataReserva ? new Date(`${item.dataReserva}T12:00:00`) : null
              return <div className="crm-reservation" key={item.idReserva}>
                <div className="res-date-block"><strong>{day?.toLocaleDateString('pt-BR', { day: '2-digit' }) || '--'}</strong><small>{day?.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase() || ''}</small></div>
                <div className="crm-res-main"><strong>{item.tituloEvento}</strong><small>{item.espaco} · {item.horarioInicio}-{item.horarioFim} · {item.solicitante}{item.quantidadeParticipantes ? ` · ${item.quantidadeParticipantes} visitantes` : ''}</small></div>
                {item.excedeCota && <span className="quota-exceeded-badge">Excede cota · negociar</span>}
                <span className={`status-pill ${item.statusReserva === 'Confirmada' ? 'status-confirmed' : item.statusReserva === 'Cancelada' ? 'status-cancelled' : 'status-pending'}`}><i />{reservationStatusLabel(item.statusReserva)}</span>
                {item.statusReserva === 'Pendente' && <button className="decision-button compact-decision" disabled={approvingReservationId !== null} onClick={() => approve(item)}><Check size={14} /> {approvingReservationId === item.idReserva ? 'Aprovando...' : item.excedeCota && !item.dataNegociacao ? 'Negociar' : 'Aprovar'}</button>}
                {item.statusReserva !== 'Cancelada' && <button className="table-action" onClick={() => editReservation(item)}>Editar</button>}
                {item.statusReserva !== 'Cancelada' && <button className="table-action table-action-danger" onClick={() => { setReservationCancelTarget(item); setReservationCancelReason(''); setReservationCancelError('') }}>Cancelar</button>}
              </div>
            })}</div>
          </div>
        </>}
        {section === 'Cadastros' && <><CrmTitle title="Cadastros e ficha do cliente" description="Consulte dados, histórico e ações de cada cadastro em uma ficha única." action={<Button icon={Plus} onClick={() => { setRegistrationCreateError(''); setRegistrationCreateOpen(true) }}>Novo cadastro</Button>} /><div className="crm-panel"><div className="panel-heading"><div className="segmented-control"><button type="button" className={partnerScope === 'all' ? 'segment-active' : ''} aria-pressed={partnerScope === 'all'} onClick={() => setPartnerScope('all')}>Todos os cadastros</button><button type="button" className={partnerScope === 'pending' ? 'segment-active' : ''} aria-pressed={partnerScope === 'pending'} onClick={() => setPartnerScope('pending')}>Aguardando classificação <span>{partners.filter(p => !p.persona).length}</span></button></div><button type="button" className="subtle-action" onClick={exportPartners}><Download size={15} /> Exportar CSV</button></div><table className="data-table"><thead><tr><th>Organização</th><th>Responsável</th><th>E-mail</th><th>Ações</th></tr></thead><tbody>{filteredPartners.map(p => { return <tr key={p.userId || p.id}><td><strong>{p.name}</strong><small>{p.dataCadastro ? new Date(p.dataCadastro).toLocaleDateString('pt-BR') : 'Cadastro sem data'}</small></td><td><div className="team-person-cell"><Avatar user={clientUsers.find(person => person.idUsuario === p.userId) || { idUsuario: p.userId, nomeCompleto: p.contact }} tamanho={34} /><span>{p.contact}</span></div></td><td>{p.email}</td><td>{p.persona ? 'Classificado' : 'Aguardando classificação'}</td><td><button type="button" className="table-action client-profile-open" onClick={() => setClientProfile(clientUsers.find(person => person.idUsuario === p.userId) || null)}>Abrir ficha <ArrowRight size={14} /></button></td></tr> })}</tbody></table></div><div className="privacy-callout"><ShieldCheck size={18} /><span><strong>Dados internos</strong><small>Os dados detalhados do cadastro ficam disponíveis apenas para a equipe autorizada na ficha do solicitante.</small></span></div></>}
        {section === 'Espaços' && <><CrmTitle title="Gestão de espaços" description="Mantenha o catálogo de ambientes atualizado e disponível." action={<Button icon={Plus} onClick={() => setSpaceModal(true)}>Novo espaço</Button>} /><div className="crm-panel"><table className="data-table"><thead><tr><th>Espaço</th><th>Tipo</th><th>Capacidade</th><th>Disponibilidade</th><th>Ativo</th></tr></thead><tbody>{spaces.map(space => <tr key={space.idEspaco}><td><strong>{space.nomeEspaco}</strong><small>{space.equipamentosDisponiveis}</small></td><td>{space.tipoEspaco}</td><td>{space.capacidadePessoas} pessoas</td><td>{space.ativo !== false ? <span className="availability-text"><i /> Disponível</span> : <span className="availability-text availability-unavailable"><i /> Indisponível<small>{space.motivoIndisponibilidade}</small><small>{unavailableDeadlineLabel(space.dataPrevisaoRetorno)}</small></span>}</td><td><button className={`toggle ${space.ativo !== false ? 'toggle-on' : ''}`} aria-label={`${space.ativo !== false ? 'Inativar' : 'Reativar'} ${space.nomeEspaco}`} aria-pressed={space.ativo !== false} onClick={() => toggleSpace(space)}><span /></button></td></tr>)}</tbody></table></div></>}
        {section === 'Atendimento' && <><CrmTitle title="Dúvidas e mensagens" description="Acompanhe os contatos recebidos pelo portal público." /><div className="support-grid"><div className="crm-panel support-list"><div className="panel-heading"><div><Title as="h2">{pendingQuestions.length} {pendingQuestions.length === 1 ? 'conversa aberta' : 'conversas abertas'}</Title></div><label className="ticket-filter">Status<select aria-label="Filtrar conversas por status" value={ticketStatusFilter} onChange={event => setTicketStatusFilter(event.target.value)}><option>Todas</option><option>Abertas</option><option>Respondidas</option></select></label></div>{filteredTickets.length ? filteredTickets.slice().sort((left, right) => new Date(right.dataEnvio).getTime() - new Date(left.dataEnvio).getTime()).map(ticket => <button className={`ticket-row ${selectedTicket?.idDuvida === ticket.idDuvida ? 'ticket-selected' : ''}`} key={ticket.idDuvida} onClick={() => setSelectedTicket(ticket)}><Avatar user={clientUsers.find(person => person.email?.toLowerCase() === ticket.emailContato?.toLowerCase())} nome={ticket.emailContato.split('@')[0].split(/[._-]/).join(' ')} tamanho={36} className="ticket-avatar" /><span><strong>{ticket.emailContato}</strong><small>{ticket.mensagemDuvida}</small><em>{new Date(ticket.dataEnvio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</em></span></button>) : <div className="empty-state"><MessageCircle size={24} /><p>Nenhuma conversa recebida.</p></div>}</div><div className="crm-panel ticket-detail">{selectedTicket ? <><div className="ticket-detail-head"><div><span className={`status-pill ${selectedTicket.statusAtendimento === 'Respondida' ? 'status-confirmed' : 'status-pending'}`}><i />{selectedTicket.statusAtendimento}</span><small>{new Date(selectedTicket.dataEnvio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small></div>{selectedTicket.caminhoAnexo && <a className="table-action" href={`${API}/duvidas/${selectedTicket.idDuvida}/anexo`} target="_blank" rel="noreferrer"><Download size={15} /> Anexo</a>}</div><Title as="h2">{selectedTicket.emailContato}</Title><p>{selectedTicket.mensagemDuvida}</p>{selectedTicket.telefoneContato && <div className="ticket-sender"><Avatar user={clientUsers.find(person => person.email?.toLowerCase() === selectedTicket.emailContato?.toLowerCase())} nome={selectedTicket.emailContato.split('@')[0].split(/[._-]/).join(' ')} tamanho={36} className="ticket-avatar" /><span><strong>Telefone para retorno</strong><small>{selectedTicket.telefoneContato}</small></span></div>}<label>Sua resposta<textarea rows="5" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Escreva uma resposta para enviar por e-mail..." /></label><Button disabled={!answer.trim()} onClick={sendAnswer}><Mail size={16} /> Enviar resposta por e-mail</Button></> : <div className="empty-state"><MessageCircle size={24} /><p>Nenhuma dúvida recebida.</p></div>}</div></div></>
        }
        {section === 'Auditoria' && <><CrmTitle title="Histórico de ações" description="Acompanhe quem fez cada alteração, quando aconteceu e qual registro foi afetado." /><div className="crm-panel audit-panel"><div className="audit-toolbar"><label className="audit-search"><Search size={17} /><input type="search" value={auditQuery} onChange={event => setAuditQuery(event.target.value)} placeholder="Buscar por responsável, ação ou registro" aria-label="Buscar no histórico de auditoria" /></label><label className="audit-filter-label">Ação<select value={auditActionFilter} onChange={event => setAuditActionFilter(event.target.value)} aria-label="Filtrar por ação"><option>Todas</option>{auditActions.map(action => <option key={action}>{action}</option>)}</select></label><span className="audit-result-count">{filteredAuditItems.length} {filteredAuditItems.length === 1 ? 'registro' : 'registros'}</span></div><div className="audit-table-wrap"><table className="data-table audit-table"><thead><tr><th>Data e hora</th><th>Responsável</th><th>Ação</th><th>Registro afetado</th><th>Detalhes</th></tr></thead><tbody>{filteredAuditItems.map((item, i) => <tr key={`${item.time}-${item.user}-${i}`}><td><span className="audit-time">{item.time}</span></td><td><strong className="audit-actor">{item.user}</strong></td><td><span className="audit-action"><i />{item.action}</span></td><td><strong className="audit-target">{item.target}</strong></td><td className="audit-detail">{item.detail}</td></tr>)}</tbody></table>{filteredAuditItems.length === 0 && <div className="audit-empty"><ListChecks size={22} /><strong>{auditItems.length ? 'Nenhum registro encontrado' : 'Ainda não há ações registradas'}</strong><span>{auditItems.length ? 'Tente ajustar a busca ou o filtro selecionado.' : 'As alterações realizadas pela equipe aparecerão aqui.'}</span></div>}</div></div></>}
        {section === 'Equipe' && user.perfil === 1 && <><CrmTitle title="Equipe e permissões" description="Gerencie colaboradores e papéis de acesso ao InPETU Connect." /><div className="crm-panel"><table className="data-table"><thead><tr><th>Colaborador</th><th>E-mail</th><th>Perfil</th><th>Status</th><th /></tr></thead><tbody>{staff.map(person => { const isCurrentUser = person.email?.toLowerCase() === user.email?.toLowerCase(); return <tr key={person.idUsuario}><td><div className="team-person-cell"><Avatar user={person} tamanho={34} /><span><strong>{person.nomeCompleto}</strong><small>{person.cargoVinculo}</small></span></div></td><td>{person.email}</td><td>{['', 'Coordenador', 'Gestor de Espaços', 'Staff/Atendente'][person.idPerfil]}</td><td><span className={`status-pill ${person.ativo ? 'status-confirmed' : 'status-cancelled'}`}><i />{person.ativo ? 'Ativo' : 'Inativo'}</span></td><td>{isCurrentUser ? <span className="table-action-disabled" title="Você não pode alterar seu próprio perfil">Seu perfil</span> : <button className="table-action" onClick={() => setRoleTarget({ ...person })}>Gerenciar papel</button>}</td></tr> })}</tbody></table></div></>}
      </div></main>{toast && <div className="toast"><Check size={17} />{toast}</div>}
    <Modal open={Boolean(reservationCancelTarget)} close={() => { if (!reservationCancelBusy) { setReservationCancelTarget(null); setReservationCancelError('') } }} title="Cancelar reserva">
      <div className="cancel-summary"><span>RESERVA #{reservationCancelTarget?.idReserva}</span><strong>{reservationCancelTarget?.tituloEvento}</strong><small>{reservationCancelTarget?.dataReserva} · {reservationCancelTarget?.horarioInicio}-{reservationCancelTarget?.horarioFim}</small></div>
      <p className="access-intro">O cancelamento da equipe é permitido em qualquer data. O solicitante e a equipe receberão uma notificação por e-mail e no painel.</p>
      <label className="reason-field">Motivo do cancelamento<textarea rows="4" maxLength={1000} required value={reservationCancelReason} onChange={event => { setReservationCancelReason(event.target.value); setReservationCancelError('') }} placeholder="Informe o motivo para manter no histórico" /></label>
      {reservationCancelError && <p className="form-message" role="alert">{reservationCancelError}</p>}
      <Button variant="danger" disabled={!reservationCancelReason.trim() || reservationCancelBusy} onClick={cancelReservationByTeam}>{reservationCancelBusy ? 'Cancelando...' : 'Confirmar cancelamento'}</Button>
    </Modal>
    <Modal open={Boolean(reservationEditTarget)} close={() => { if (!reservationEditBusy) { setReservationEditTarget(null); setReservationEditForm(null); setReservationEditError('') } }} title="Editar reserva" wide>
      {reservationEditForm && <form className="form-stack" onSubmit={saveReservationEdit}>
        <p className="access-intro">As alterações são auditadas. Horários ocupados não podem ser salvos; se a nova duração ultrapassar a cota do cliente, a reserva volta para negociação manual.</p>
        <label>Título do encontro<input required maxLength={150} value={reservationEditForm.tituloEvento} onChange={event => setReservationEditForm({ ...reservationEditForm, tituloEvento: event.target.value })} /></label>
        <label>Descrição e finalidade<textarea required rows={3} value={reservationEditForm.descricaoFinalidade} onChange={event => setReservationEditForm({ ...reservationEditForm, descricaoFinalidade: event.target.value })} /></label>
        <section className="reservation-contact-card" aria-label="Contato desta reserva">
          <strong>Contato desta reserva</strong>
          <label>Telefone para contato ou alteração<PhoneInput value={reservationEditForm.telefoneContato} onChange={telefoneContato => setReservationEditForm({ ...reservationEditForm, telefoneContato })} /><small>Celular informado pelo solicitante para assuntos desta reserva.</small></label>
        </section>
        <label>Espaço<select value={reservationEditForm.idEspaco} onChange={event => setReservationEditForm({ ...reservationEditForm, idEspaco: event.target.value })}>{spaces.map(space => <option key={space.idEspaco} value={space.idEspaco}>{space.nomeEspaco}</option>)}</select></label>
        <label>Data<input required type="date" value={reservationEditForm.dataReserva} onChange={event => setReservationEditForm({ ...reservationEditForm, dataReserva: event.target.value })} /></label>
        <div className="form-row"><label>Início<input required type="time" value={reservationEditForm.horarioInicio} onChange={event => setReservationEditForm({ ...reservationEditForm, horarioInicio: event.target.value })} /></label><label>Fim<input required type="time" value={reservationEditForm.horarioFim} onChange={event => setReservationEditForm({ ...reservationEditForm, horarioFim: event.target.value })} /></label></div>
        {isGuidedTour(spaces.find(space => Number(space.idEspaco) === Number(reservationEditForm.idEspaco))?.tipoEspaco) && <label>Quantidade de visitantes<input required type="number" min="1" value={reservationEditForm.quantidadeParticipantes} onChange={event => setReservationEditForm({ ...reservationEditForm, quantidadeParticipantes: event.target.value })} /></label>}
        {reservationEditError && <p className="form-message" role="alert">{reservationEditError}</p>}
        <Button type="submit" disabled={reservationEditBusy}>{reservationEditBusy ? 'Salvando...' : 'Salvar alterações'} <Check size={16} /></Button>
      </form>}
    </Modal>
    <Modal open={Boolean(negotiationTarget)} close={() => { if (!negotiationBusy) { setNegotiationTarget(null); setNegotiationError('') } }} title="Negociar excedente de cota">
      <div className="quota-negotiation-callout"><strong>{negotiationTarget?.solicitante}</strong><span>{negotiationTarget?.tituloEvento}</span><small>Registre o contato e o resultado da negociação com o solicitante. A reserva só poderá ser aprovada depois desse registro.</small></div>
      <label className="reason-field">Contato e resultado da negociação<textarea rows="5" required maxLength={4000} value={negotiationNote} onChange={event => setNegotiationNote(event.target.value)} placeholder="Informe quando e como o solicitante foi contatado e qual foi o acordo." /></label>
      {negotiationError && <p className="form-message" role="alert">{negotiationError}</p>}
      <Button disabled={!negotiationNote.trim() || negotiationBusy} onClick={recordNegotiationAndApprove}>{negotiationBusy ? 'Registrando...' : 'Registrar negociação e aprovar'} <Check size={16} /></Button>
    </Modal>
    <ClientProfileDialog key={clientProfile?.idUsuario || 'closed'} client={clientProfile} reservations={reservations} tickets={tickets} auditItems={auditItems} close={() => setClientProfile(null)} onSave={saveClientProfile} onPersona={saveClientPersona} onDeactivate={deactivateClient} canDeactivate={user.perfil === 1} canResetPassword={user.perfil === 1} onResetPassword={(target, payload) => request(`/usuarios/${target.idUsuario}/redefinir-senha`, { method: 'POST', body: JSON.stringify(payload) })} />
    <Modal open={Boolean(roleTarget)} close={() => { if (!roleSaveBusy) { setRoleTarget(null); setRoleSaveError('') } }} title="Gerenciar papel">{roleTarget && <><div className="classify-org"><Avatar user={roleTarget} tamanho={40} className="org-avatar" /><span><strong>{roleTarget.nomeCompleto}</strong><small>{roleTarget.email}</small></span></div><label className="role-select-label">Perfil de acesso<select value={roleTarget.idPerfil} onChange={event => { setRoleTarget({ ...roleTarget, idPerfil: Number(event.target.value) }); setRoleSaveError('') }}><option value="1">Coordenador</option><option value="2">Gestor de Espaços</option><option value="3">Staff / Atendente</option></select></label>{roleSaveError && <p className="form-message" role="alert">{roleSaveError}</p>}<Button disabled={roleSaveBusy || Number(roleTarget.idPerfil) === staff.find(person => person.idUsuario === roleTarget.idUsuario)?.idPerfil} onClick={saveRole}>{roleSaveBusy ? 'Salvando...' : 'Salvar papel'} <Check size={16} /></Button></>}</Modal>
    <Modal open={registrationCreateOpen} close={() => { if (!registrationCreateBusy) { setRegistrationCreateOpen(false); setRegistrationCreateError('') } }} title="Criar cadastro para uma organização">
      <form className="form-stack" onSubmit={createRegistration}>
        <p className="access-intro">Cadastre a organização e uma pessoa responsável. A pessoa entrará usando e-mail e senha.</p>
        <label>Nome da organização<input required maxLength={100} value={newRegistration.organizacao} onChange={event => setNewRegistration({ ...newRegistration, organizacao: event.target.value })} /></label>
        <label>Nome do responsável<input required maxLength={100} value={newRegistration.nomeCompleto} onChange={event => setNewRegistration({ ...newRegistration, nomeCompleto: event.target.value })} /></label>
        <label>E-mail<input required type="email" maxLength={100} value={newRegistration.email} onChange={event => setNewRegistration({ ...newRegistration, email: event.target.value })} /></label>
        <div className="form-row">
          <label>Telefone (opcional)<PhoneInput value={newRegistration.telefone} onChange={telefone => setNewRegistration({ ...newRegistration, telefone })} /></label>
          <label>Cargo ou vínculo<input required maxLength={100} value={newRegistration.cargoVinculo} onChange={event => setNewRegistration({ ...newRegistration, cargoVinculo: event.target.value })} /></label>
        </div>
        <label>Senha inicial<input required minLength={8} maxLength={64} type="password" autoComplete="new-password" value={newRegistration.senha} onChange={event => setNewRegistration({ ...newRegistration, senha: event.target.value })} /></label>
        {registrationCreateError && <p className="form-message" role="alert">{registrationCreateError}</p>}
        <Button type="submit" disabled={registrationCreateBusy}>{registrationCreateBusy ? 'Criando cadastro...' : 'Criar cadastro'} <Check size={16} /></Button>
      </form>
    </Modal>
    <Modal open={Boolean(spaceToDeactivate)} close={() => { if (!spaceStatusBusy) { setSpaceToDeactivate(null); setSpaceReason(''); setSpaceReturnDate(''); setSpaceStatusError('') } }} title="Marcar espaço como indisponível"><p className="access-intro">Informe o motivo e, se souber, quando o espaço deve voltar a ficar disponível. A data é opcional.</p><div className="cancel-summary"><strong>{spaceToDeactivate?.nomeEspaco}</strong><small>O espaço e seus horários não poderão ser solicitados até ser reativado.</small></div><label className="reason-field">Motivo da indisponibilidade<textarea rows="4" maxLength={500} required value={spaceReason} onChange={event => setSpaceReason(event.target.value)} placeholder="Ex.: manutenção do projetor" /></label><label className="reason-field unavailable-date-field">Previsão de retorno (opcional)<input type="date" min={localDateValue()} value={spaceReturnDate} onChange={event => setSpaceReturnDate(event.target.value)} /></label>{spaceStatusError && <p className="form-message" role="alert">{spaceStatusError}</p>}<Button variant="danger" disabled={!spaceReason.trim() || spaceStatusBusy} onClick={() => updateSpaceStatus(spaceToDeactivate, false, spaceReason, spaceReturnDate || null)}>{spaceStatusBusy ? 'Salvando...' : 'Confirmar indisponibilidade'}</Button></Modal>
    <Modal open={spaceModal} close={closeSpaceModal} title="Adicionar espaço">
      <form className="form-stack" onSubmit={addSpace}>
        <label>Nome do espaço<input required maxLength={100} value={newSpace.nomeEspaco} onChange={event => setNewSpace({ ...newSpace, nomeEspaco: event.target.value })} placeholder="Ex.: Laboratório de prototipagem" /></label>
        <label>Tipo de espaço<input required maxLength={50} value={newSpace.tipoEspaco} onChange={event => setNewSpace({ ...newSpace, tipoEspaco: event.target.value })} placeholder="Digite um tipo ou categoria" /></label>
        <label>Capacidade<input required type="number" min="1" value={newSpace.capacidadePessoas} onChange={event => setNewSpace({ ...newSpace, capacidadePessoas: Number(event.target.value) })} /></label>
        <label>Equipamentos ou descrição (opcional)<textarea rows="3" maxLength={2000} value={newSpace.equipamentosDisponiveis} onChange={event => setNewSpace({ ...newSpace, equipamentosDisponiveis: event.target.value })} placeholder="Ex.: Impressora 3D, bancadas e ferramentas" /></label>
        <label>Imagem do espaço (PNG ou JPG, até 5 MB)<input type="file" accept="image/png,image/jpeg" onChange={event => selectSpaceImage(event.target.files?.[0])} /></label>
        {spaceImagePreview && <img src={spaceImagePreview} alt="Pré-visualização da imagem do espaço" className="space-image-preview" />}
        {spaceImageError && <p className="form-message" role="alert">{spaceImageError}</p>}
        {spaceCreateError && <p className="form-message" role="alert">{spaceCreateError}</p>}
        <Button type="submit" disabled={spaceCreateBusy || Boolean(spaceImageError)}>{spaceCreateBusy ? 'Salvando espaço...' : 'Adicionar ao catálogo'} <Plus size={16} /></Button>
      </form>
    </Modal></div>
}