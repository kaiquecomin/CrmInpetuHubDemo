import { Fragment, useEffect, useMemo, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems, Tab, TabGroup, TabList, TabPanel, TabPanels, Transition, TransitionChild } from '@headlessui/react'
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bell, Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, DoorOpen, Download, ExternalLink, FileText, Filter, GraduationCap, Home as HomeIcon, LayoutDashboard, ListChecks, Mail, MapPin, Menu as MenuIcon, MessageCircle, MoreHorizontal, Plus, Search, ShieldCheck, SlidersHorizontal, Users, X } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'
const getDb = () => localStorage.getItem('inpetu-db') === 'test' ? 'test' : 'main'
const withDb = url => getDb() === 'test' ? `${url}${url.includes('?') ? '&' : '?'}db=test` : url
const isGuidedTour = type => type?.trim().toLocaleLowerCase('pt-BR') === 'visita guiada'
const images = {
  'Auditório': 'https://images.unsplash.com/photo-1773829020694-413e879d2957?crop=entropy&cs=srgb&fm=jpg&w=1100&q=85',
  'Sala de aula': 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1000&q=85',
  Coworking: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1000&q=85',
  'Sala de reunião': 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1000&q=85',
  'Visita guiada': 'https://images.unsplash.com/photo-1771911650735-b471e85e8b17?auto=format&fit=crop&w=1000&q=85',
}
const localDateValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const calendarDaysUntil = value => {
  const [year, month, day] = value.split('-').map(Number)
  const now = new Date()
  return (Date.UTC(year, month - 1, day) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000
}
const unavailableDeadlineLabel = date => date
  ? `Previsão de retorno: ${new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`
  : 'Prazo indeterminado'
const addMinutesToTime = (time, minutes) => {
  const [hours, mins] = time.split(':').map(Number)
  const total = hours * 60 + mins + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
const starterSpaces = [
  { idEspaco: 1, nomeEspaco: 'Auditório Principal', tipoEspaco: 'Auditório', capacidadePessoas: 80, equipamentosDisponiveis: 'Palco · Som · Projeção', ativo: true },
  { idEspaco: 2, nomeEspaco: 'Sala de Aula 1', tipoEspaco: 'Sala de aula', capacidadePessoas: 35, equipamentosDisponiveis: 'Projetor · Quadro branco', ativo: true },
  { idEspaco: 3, nomeEspaco: 'Área de Coworking', tipoEspaco: 'Coworking', capacidadePessoas: 24, equipamentosDisponiveis: 'Wi-Fi · Mesas compartilhadas', ativo: true },
  { idEspaco: 4, nomeEspaco: 'Sala de Reunião 1', tipoEspaco: 'Sala de reunião', capacidadePessoas: 6, equipamentosDisponiveis: 'Videoconferência · Display', ativo: true },
  { idEspaco: 5, nomeEspaco: 'Sala de Reunião 2', tipoEspaco: 'Sala de reunião', capacidadePessoas: 10, equipamentosDisponiveis: 'Videoconferência · Quadro', ativo: true },
  { idEspaco: 6, nomeEspaco: 'Visita Guiada', tipoEspaco: 'Visita guiada', capacidadePessoas: 20, equipamentosDisponiveis: 'Experiência acompanhada', ativo: true },
]
const initialReservations = [
  { idReserva: 104, tituloEvento: 'Encontro de pesquisa aplicada', espaco: 'Auditório Principal', dataReserva: '2026-10-08', horarioInicio: '09:00', horarioFim: '11:30', statusReserva: 'Pendente', solicitante: 'Marina Costa', persona: 2 },
  { idReserva: 103, tituloEvento: 'Workshop de prototipagem', espaco: 'Sala de Aula 1', dataReserva: '2026-10-08', horarioInicio: '10:00', horarioFim: '12:00', statusReserva: 'Pendente', solicitante: 'Lucas Martins', persona: 3 },
  { idReserva: 102, tituloEvento: 'Conexão ecossistema', espaco: 'Sala de Reunião 2', dataReserva: '2026-10-08', horarioInicio: '14:00', horarioFim: '15:30', statusReserva: 'Confirmada', solicitante: 'ACATE', persona: 3 },
]
const initialPartners = [
  { id: 1, name: 'Fundação Horizonte', contact: 'Ana Beatriz', email: 'ana@horizonte.org', status: 'Aguardando persona', persona: null },
  { id: 2, name: 'Nexo Tecnologia', contact: 'Bruno Lima', email: 'bruno@nexo.dev', status: 'Aguardando persona', persona: null },
  { id: 3, name: 'Universidade Federal de Santa Catarina', contact: 'Marina Costa', email: 'marina@ufsc.br', status: 'Persona definida', persona: 2 },
]
const personas = {
  1: { label: 'InPETU Hub', quota: null, badge: 'priority-one' },
  2: { label: 'UFSC outros', quota: 30, badge: 'priority-two' },
  3: { label: 'Ecossistema Sapiens Parque', quota: 20, badge: 'priority-three' },
  4: { label: 'Governo, ICTs e 3º setor', quota: 10, badge: 'priority-four' },
  5: { label: 'Outros parceiros do InPETU', quota: 10, badge: 'priority-two' },
  6: { label: 'Externos', quota: null, badge: 'priority-four' },
}
const reservationDurationHours = reservation => {
  const [startHour, startMinute] = (reservation.horarioInicio || '00:00').split(':').map(Number)
  const [endHour, endMinute] = (reservation.horarioFim || '00:00').split(':').map(Number)
  return Math.max(0, ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60)
}
const monthlyQuotaUsed = (items, userId, date = new Date()) => items
  .filter(item => item.idSolicitante === userId
    && ['Pendente', 'Confirmada'].includes(item.statusReserva)
    && item.dataReserva?.slice(0, 7) === `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  .reduce((total, item) => total + reservationDurationHours(item), 0)
async function request(path, options = {}) {
  const token = localStorage.getItem('inpetu-token')
  const isFormData = options.body instanceof FormData
  const headers = { ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-Database': getDb(), ...options.headers }
  let response
  try {
    response = await fetch(`${API}${path}`, { ...options, headers })
  } catch (error) {
    if (error instanceof TypeError) throw new Error(`Não foi possível conectar à API (${API}). Inicie o backend Spring Boot e confirme que o MySQL está disponível.`)
    throw error
  }
  const text = await response.text()
  let body = null
  if (text) {
    try { body = JSON.parse(text) } catch { body = { message: text } }
  }
  if (response.status === 403 && /^\/espacos\/[^/]+\/status$/.test(path)) {
    throw new Error('A API recusou a alteração (HTTP 403). O perfil deve ser Coordenador ou Gestor de Espaços. Se você já entrou com um desses perfis, reinicie o backend Spring Boot e faça login novamente para carregar as regras atualizadas.')
  }
  if (response.status === 403 && /^\/organizacoes\/[^/]+\/descredenciar$/.test(path)) {
    throw new Error('A API recusou a exclusão (HTTP 403). Essa ação exige perfil Coordenador. Se você já entrou com esse perfil, reinicie o backend Spring Boot e faça login novamente para carregar as regras atualizadas.')
  }
  if (response.status === 403 && path === '/auth/login') {
    throw new Error('E-mail ou senha incorretos para o banco conectado. Para as contas e senhas fictícias, inicie o backend com o profile demo e o banco inpetu_connect_demo; no banco padrão, use a senha já cadastrada para sua conta.')
  }
  if (!response.ok) throw new Error(body?.detail || body?.message || body?.title || body?.error || `Falha na solicitação (HTTP ${response.status}).`)
  return body
}
function uploadQuestion(data, file, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('dados', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    form.append('anexo', file)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API}/duvidas`)
    xhr.setRequestHeader('X-Database', getDb())
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)) }
    xhr.onload = () => {
      const result = xhr.responseText ? JSON.parse(xhr.responseText) : null
      if (xhr.status >= 200 && xhr.status < 300) resolve(result)
      else reject(new Error(result?.detail || result?.message || 'Não foi possível enviar a mensagem.'))
    }
    xhr.onerror = () => reject(new Error('Falha de conexão durante o envio do anexo.'))
    xhr.send(form)
  })
}
function Logo({ inverse = false }) {
  return <span className={`brand ${inverse ? 'brand-inverse' : ''}`}><span className="brand-mark"><span /></span><span><strong>InPETU</strong><small>CONNECT · HUB UFSC</small></span></span>
}
function Button({ children, variant = 'primary', icon: Icon, className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{Icon && <Icon size={17} strokeWidth={1.8} />}{children}</button>
}
function Badge({ level }) {
  const item = personas[level]
  if (!item) return <span className="awaiting-label">Persona pendente</span>
  return <span className={`priority-badge ${item.badge}`}><i />P{level} · {item.label}</span>
}
function Modal({ open, close, title, children, wide = false }) {
  return <Transition appear show={open} as={Fragment}><Dialog as="div" className="dialog-root" onClose={close}>
    <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="dialog-backdrop" /></TransitionChild>
    <div className="dialog-wrap"><TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-3" enterTo="opacity-100 translate-y-0" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-3"><DialogPanel className={`dialog-panel ${wide ? 'dialog-wide' : ''}`}>
      <div className="dialog-heading"><DialogTitle className="dialog-title">{title}</DialogTitle><button className="icon-button" aria-label="Fechar" onClick={close}><X size={19} /></button></div>{children}
    </DialogPanel></TransitionChild></div>
  </Dialog></Transition>
}
function NotificationCenter({ user }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!user || !localStorage.getItem('inpetu-token')) {
      setItems([])
      return
    }
    let active = true
    const refresh = async () => {
      try {
        const notifications = await request('/notificacoes/minhas')
        if (active) { setItems(notifications); setError('') }
      } catch (loadError) {
        if (active) setError(loadError.message)
      }
    }
    refresh()
    const timer = window.setInterval(refresh, 30000)
    return () => { active = false; window.clearInterval(timer) }
  }, [user])
  async function markRead(item) {
    if (item.lida) return
    try {
      const updated = await request(`/notificacoes/${item.idNotificacao}/lida`, { method: 'PATCH' })
      setItems(current => current.map(notification => notification.idNotificacao === updated.idNotificacao ? updated : notification))
      setError('')
    } catch (markError) {
      setError(markError.message)
    }
  }
  async function markAllRead() {
    try {
      await request('/notificacoes/lidas', { method: 'PATCH' })
      setItems(current => current.map(item => ({ ...item, lida: true })))
      setError('')
    } catch (markError) {
      setError(markError.message)
    }
  }
  if (!user) return null
  const unread = items.filter(item => !item.lida).length
  return <div className="notification-center">
    <button type="button" className="notification-trigger" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ''}`} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <Bell size={19} />{unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <section className="notification-popover" aria-label="Notificações">
      <div className="notification-heading"><strong>Notificações</strong><button type="button" onClick={markAllRead} disabled={!unread}>Marcar todas como lidas</button></div>
      {error && <p className="notification-error" role="alert">{error}</p>}
      {items.length ? <div className="notification-list">{items.slice(0, 12).map(item => <button type="button" key={item.idNotificacao} className={`notification-item ${item.lida ? '' : 'notification-unread'}`} onClick={() => markRead(item)}>
        <span><strong>{item.titulo}</strong><small>{item.mensagem}</small><time>{new Date(item.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>{item.statusEmail !== 'ENVIADO' && <em>E-mail {item.statusEmail === 'DESATIVADO' ? 'desativado' : 'não enviado — verifique a configuração SMTP'}</em>}</span>
        {!item.lida && <i aria-label="Não lida" />}
      </button>)}</div> : <p className="notification-empty">Você não tem notificações.</p>}
    </section>}
  </div>
}
function Header({ view, setView, openLogin, onOpenCalendar, user }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const goTo = (id) => { setView('home'); setMenuOpen(false); window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0) }
  return <header className="site-header reference-header"><div className="header-inner"><button className="logo-button" onClick={() => { setView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><span className="reference-logo-icon"><Building2 size={20} /></span><span className="reference-brand-copy"><strong>InPETU Connect</strong><small>UFSC · LOTE 73</small></span></button>
    <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`}><button className={view === 'home' ? 'nav-active' : ''} onClick={() => { setView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); setMenuOpen(false) }}>Início</button><button onClick={() => goTo('spaces')}>Nossos Espaços</button><button onClick={() => goTo('about')}>Sobre o Hub</button><button className={view === 'help' ? 'nav-active' : ''} onClick={() => { setView('help'); setMenuOpen(false) }}>Fale Conosco</button></nav>
    <div className="header-actions">{user && <NotificationCenter user={user} />}<button className="team-link reference-login" onClick={() => { if (user) setView('reservations'); else openLogin(); setMenuOpen(false) }}>{user ? 'Minhas Reservas' : 'Entrar / Minhas Reservas'}</button><Button icon={CalendarDays} className="reference-header-cta" onClick={() => { onOpenCalendar(); setMenuOpen(false) }}>Agendar Espaço</Button></div><button className="mobile-menu icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu"><MenuIcon /></button>
  </div></header>
}
function Home({ spaces, onConsultSpace, onSearchAvailability, onOpenCalendar }) {
  const [filter, setFilter] = useState('Todos os espaços')
  const filtered = filter === 'Todos os espaços' ? spaces : spaces.filter(space => space.tipoEspaco === filter)
  const types = ['Todos os espaços', ...new Set(spaces.map(space => space.tipoEspaco))]
  const todayValue = localDateValue()
  const [searchType, setSearchType] = useState('')
  const [searchDate, setSearchDate] = useState(todayValue)
  return <>
    <section className="hero-shell reference-hero">
      <div className="reference-hero-copy">
        <div className="eyebrow reference-location"><MapPin size={14} /> Lote 73 · Sapiens Parque · Florianópolis</div>
        <h1 className="reference-heading">Um espaço para suas ideias <em>ganharem vida.</em></h1>
        <p className="reference-description">Encontre o ambiente certo para se reunir, aprender e fazer acontecer no InPETU Hub.</p>
        <form id="availability-search" className="availability-search" onSubmit={event => { event.preventDefault(); onSearchAvailability(searchDate, searchType) }}>
          <label><span>Tipo de espaço</span><select value={searchType} onChange={event => setSearchType(event.target.value)}><option value="">Todos os espaços</option>{[...new Set(spaces.map(space => space.tipoEspaco))].map(type => <option value={type} key={type}>{type}</option>)}</select></label>
          <label><span>Data desejada</span><input type="date" min={todayValue} value={searchDate} onChange={event => setSearchDate(event.target.value)} /></label>
          <Button type="submit" icon={Search}>Consultar horários</Button>
        </form>
        <dl className="reference-stats">
          <div><dt>08h–22h</dt><dd>Horário de funcionamento</dd></div>
          <div><dt>{spaces.length}</dt><dd>Ambientes no Hub</dd></div>
          <div><dt>UFSC</dt><dd>Inovação em Florianópolis</dd></div>
        </dl>
      </div>
      <div className="reference-hero-images">
        <img className="reference-auditorium" src={images['Auditório']} alt="Auditório do InPETU Hub preparado para eventos e capacitações" />
        <img className="reference-coworking" src={images.Coworking} alt="Área de coworking iluminada do InPETU Hub" />
        <div className="hero-image-note"><span><Building2 size={18} /></span><div><strong>Seu próximo encontro começa aqui</strong><small>InPETU Hub · Sapiens Parque</small></div></div>
      </div>
    </section>
    <section id="spaces" className="spaces-section"><div className="section-top"><div><div className="eyebrow">LOTE 73 · INPETU HUB</div><h2>Nossos <em>Espaços</em></h2><p>Ambientes preparados para capacitações, eventos, mentorias e visitas técnicas.</p></div><button className="all-spaces-link" onClick={onOpenCalendar}>Abrir calendário completo <ArrowRight size={16} /></button></div>
      <div className="filter-row"><div className="filter-label"><SlidersHorizontal size={15} /> EXPLORE POR TIPO</div>{types.map(type => <button key={type} className={`filter-chip ${filter === type ? 'filter-chip-active' : ''}`} onClick={() => setFilter(type)}>{type}</button>)}</div>
      <div className="space-grid">{filtered.map((space, index) => { const unavailable = space.ativo === false; const guidedTourSpace = isGuidedTour(space.tipoEspaco); const image = space.arquivoImagem ? withDb(`${API}/espacos/${space.idEspaco}/imagem`) : images[space.tipoEspaco] || images.Coworking; return <article className={`space-card ${index === 0 ? 'space-card-featured' : ''} ${unavailable ? 'space-card-unavailable' : ''}`} key={space.idEspaco}><button className="space-image" onClick={() => onConsultSpace(space)} aria-label={`Consultar disponibilidade de ${space.nomeEspaco}`} style={{ backgroundImage: `url("${image}")` }}><span className="space-image-count">{String(index + 1).padStart(2, '0')} / {String(filtered.length).padStart(2, '0')}</span>{unavailable ? <span className="space-unavailable-overlay">INDISPONÍVEL</span> : <span className="availability-dot"><i /> Disponível</span>}</button><div className="space-info"><div className="space-meta"><span>{space.tipoEspaco}</span><span><Users size={14} /> Até {space.capacidadePessoas || 20} pessoas</span></div><h3>{space.nomeEspaco}</h3><p>{unavailable ? <>{space.motivoIndisponibilidade || 'Este espaço está temporariamente indisponível.'}<small className="unavailable-deadline">{unavailableDeadlineLabel(space.dataPrevisaoRetorno)}</small></> : space.equipamentosDisponiveis || 'Um ambiente versátil para as suas ideias.'}</p><button className="space-cta" onClick={() => onConsultSpace(space)}>{unavailable ? 'Ver motivo' : guidedTourSpace ? 'Solicitar visita' : 'Ver Horários'}</button></div></article> })}</div>
    </section>
    <section id="about" className="about-hub"><div className="about-copy"><div className="eyebrow">CIÊNCIA, TECNOLOGIA E CONEXÕES</div><h2>Sobre o <em>Hub</em></h2><p>O <strong>Centro de Inovação InPETU Hub</strong> está instalado no <strong>Lote 73 do Parque Tecnológico Sapiens Parque</strong>, em Canasvieiras, Florianópolis, conectando pesquisa, empreendedorismo e desenvolvimento tecnológico.</p><p>O Hub oferece infraestrutura compartilhada para capacitações, eventos, mentorias e visitas técnicas, com espaços que podem ser consultados e solicitados diretamente pelo InPETU Connect.</p><ul><li><Check size={15} /> Infraestrutura multimídia para encontros e capacitações</li><li><Check size={15} /> Agendamento digital e acompanhamento pela equipe</li><li><Check size={15} /> Atendimento dedicado e cuidado com seus dados</li></ul></div><aside className="ecosystem-cta"><span className="eyebrow">INPETU CONNECT</span><strong>Conheça os espaços</strong><p>Consulte o calendário e encontre um ambiente para sua próxima atividade.</p><Button icon={ArrowRight} onClick={onOpenCalendar}>Ver disponibilidade</Button></aside></section>
  </>
}
function BookingModal({ space, close, onSaved, openLogin, initialDate, initialTime, initialEndTime }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ dataReserva: '', horarioInicio: '09:00', horarioFim: '10:00', tituloEvento: '', descricaoFinalidade: '', quantidadeParticipantes: '' })
  const guidedTour = isGuidedTour(space?.tipoEspaco)
  useEffect(() => {
    if (!space) return
    const horarioInicio = guidedTour ? initialTime || '' : initialTime || '09:00'
    setForm({ dataReserva: initialDate || localDateValue(), horarioInicio, horarioFim: guidedTour ? initialEndTime || '' : initialEndTime || addMinutesToTime(horarioInicio, 30), tituloEvento: '', descricaoFinalidade: '', quantidadeParticipantes: '' })
    setMessage('')
  }, [space, initialDate, initialTime, initialEndTime, guidedTour])
  async function submit(event) {
    event.preventDefault()
    setBusy(true); setMessage('')
    try {
      const saved = await request('/reservas', { method: 'POST', body: JSON.stringify({ ...form, quantidadeParticipantes: guidedTour ? Number(form.quantidadeParticipantes) : null, idEspaco: space.idEspaco }) })
      onSaved(saved); close()
    } catch (error) {
      if (!localStorage.getItem('inpetu-token')) { close(); openLogin(); return }
      setMessage(error.message)
    } finally { setBusy(false) }
  }
  return <Modal open={Boolean(space)} close={close} title="Solicitar este espaço">
    <form className="form-stack" onSubmit={submit}><div className="selected-space"><img src={space?.arquivoImagem ? withDb(`${API}/espacos/${space.idEspaco}/imagem`) : images[space?.tipoEspaco] || images.Coworking} alt="" /><div><strong>{space?.nomeEspaco}</strong><small>{space?.tipoEspaco} · até {space?.capacidadePessoas} pessoas</small></div><span className="selected-status"><i /> {guidedTour ? 'Confirmação manual' : 'Aberto'}</span></div>
      {guidedTour && <p className="access-intro">A equipe confirma a visita, mas o intervalo fica reservado desde o primeiro pedido. Horários já solicitados não podem ser escolhidos novamente.</p>}
      <label>{guidedTour ? 'Data preferida da visita' : 'Data do encontro'}<input required type="date" min={localDateValue()} value={form.dataReserva} onChange={e => setForm({ ...form, dataReserva: e.target.value })} /></label><div className="field-pair"><label>{guidedTour ? 'Horário preferido de início' : 'Início'}<input required type="time" min="08:00" max="21:30" step="1800" value={form.horarioInicio} onChange={e => setForm({ ...form, horarioInicio: e.target.value })} /></label><label>{guidedTour ? 'Horário preferido de término' : 'Fim'}<input required type="time" min={form.horarioInicio || '08:30'} max="22:00" step="1800" value={form.horarioFim} onChange={e => setForm({ ...form, horarioFim: e.target.value })} /></label></div>
      {guidedTour && <label>Quantidade de visitantes<input required type="number" min="1" max={space?.capacidadePessoas || 20} value={form.quantidadeParticipantes} onChange={e => setForm({ ...form, quantidadeParticipantes: e.target.value })} /><small>Capacidade máxima: {space?.capacidadePessoas || 20} pessoas.</small></label>}
      <label>{guidedTour ? 'Nome do grupo ou da instituição' : 'Nome do encontro'}<input required maxLength="150" placeholder={guidedTour ? 'Ex.: Turma de Engenharia da UFSC' : 'Ex.: Oficina de prototipagem'} value={form.tituloEvento} onChange={e => setForm({ ...form, tituloEvento: e.target.value })} /></label><label>{guidedTour ? 'Objetivo ou observações da visita' : 'O que você está planejando?'}<textarea required rows="3" placeholder={guidedTour ? 'Conte brevemente o perfil do grupo e o que gostaria de conhecer' : 'Conte um pouco sobre o encontro'} value={form.descricaoFinalidade} onChange={e => setForm({ ...form, descricaoFinalidade: e.target.value })} /></label>
      {message && <p className="form-message" role="alert">{message}</p>}<Button type="submit" disabled={busy}>{busy ? 'Enviando...' : guidedTour ? 'Enviar pedido de visita' : 'Continuar solicitação'} <ArrowRight size={16} /></Button><p className="form-footnote"><ShieldCheck size={14} /> Seus dados são tratados de acordo com a LGPD.</p>
    </form>
  </Modal>
}
function AccessPage({ onLogin, onSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setNotice('')
    try {
      const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha: password }) })
      localStorage.setItem('inpetu-token', result.token); localStorage.setItem('inpetu-user', JSON.stringify(result)); onLogin(result)
    } catch (error) { setNotice(error.message) } finally { setBusy(false) }
  }
  return <main className="account-page">
    <div className="account-page-heading"><h1>Acesso ao InPETU Connect</h1><p>Entre com seu e-mail e senha para acessar sua conta.</p></div>
    <section className="account-card" aria-label="Acessar sua conta">
      <p className="account-description">Acesse para acompanhar e gerenciar suas solicitações. O painel da equipe é exibido conforme as permissões da sua conta.</p>
      <form className="form-stack account-form" onSubmit={submit}>
        <label>E-mail <span aria-hidden="true">*</span><input required type="email" autoComplete="email" placeholder="seu.email@empresa.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Senha <span aria-hidden="true">*</span><input required type="password" autoComplete="current-password" placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)} /></label>
        {notice && <p className="account-notice account-notice-error" role="alert">{notice}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Aguarde...' : 'Entrar com e-mail e senha'}</Button>
      </form>
      <p className="account-signup">Ainda não tem cadastro? <button type="button" onClick={onSignup}>Cadastre-se aqui</button></p>
      <p className="account-security"><ShieldCheck size={14} /> Acesso à equipe restrito a colaboradores autorizados.</p>
    </section>
  </main>
}
function SignupPage({ onBack }) {
  const [form, setForm] = useState({ nomeCompleto: '', email: '', telefone: '', organizacao: '', cargoVinculo: '', senha: '', confirmarSenha: '' })
  const [status, setStatus] = useState('')
  async function submit(event) { event.preventDefault(); setStatus(''); if (form.senha !== form.confirmarSenha) return setStatus('As senhas não coincidem.'); try { const { confirmarSenha, ...cadastro } = form; await request('/usuarios/cadastro-publico', { method: 'POST', body: JSON.stringify(cadastro) }); setStatus('Cadastro criado. Você já pode entrar com seu e-mail e senha.'); } catch (error) { setStatus(error.message) } }
  return <main className="account-page account-page-signup">
    <div className="account-page-heading"><h1>Criar acesso público</h1><p>Cadastre-se para solicitar espaços e acompanhar seus agendamentos.</p></div>
    <section className="account-card account-card-signup">
      <p className="account-description">Preencha seus dados. A classificação da organização é feita pela equipe InPETU.</p>
      <form className="form-stack account-form" onSubmit={submit}>
        <label>Nome completo <span aria-hidden="true">*</span><input required autoComplete="name" value={form.nomeCompleto} onChange={e => setForm({ ...form, nomeCompleto: e.target.value })} /></label>
        <label>E-mail <span aria-hidden="true">*</span><input required type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
        <label>Telefone<input type="tel" autoComplete="tel" placeholder="(48) 99999-9999" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} /></label>
        <label>Organização <span aria-hidden="true">*</span><input required value={form.organizacao} onChange={e => setForm({ ...form, organizacao: e.target.value })} /></label>
        <label>Cargo ou vínculo <span aria-hidden="true">*</span><input required value={form.cargoVinculo} onChange={e => setForm({ ...form, cargoVinculo: e.target.value })} /></label>
        <label>Senha <span aria-hidden="true">*</span><input required minLength={8} maxLength={64} type="password" autoComplete="new-password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} /></label>
        <label>Confirmar senha <span aria-hidden="true">*</span><input required minLength={8} maxLength={64} type="password" autoComplete="new-password" value={form.confirmarSenha} onChange={e => setForm({ ...form, confirmarSenha: e.target.value })} /></label>
        {status && <p className={`account-notice ${status.startsWith('Cadastro criado') ? 'account-notice-success' : 'account-notice-error'}`} role="status">{status}</p>}
        <Button type="submit">Criar conta <ArrowRight size={16} /></Button>
      </form>
      <p className="account-signup"><button type="button" onClick={onBack}>Voltar para o acesso</button></p>
    </section>
  </main>
}
function ReservationsPage({ items, onCancel }) {
  const [selected, setSelected] = useState(null)
  const [reason, setReason] = useState('')
  const [filter, setFilter] = useState('Todas')
  const [cancelError, setCancelError] = useState('')
  const [cancelBusy, setCancelBusy] = useState(false)
  const list = items.filter(item => filter === 'Todas' || item.statusReserva === filter)
  async function cancel() {
    if (!selected || !reason.trim() || cancelBusy) return
    setCancelBusy(true)
    setCancelError('')
    try {
      await request(`/reservas/${selected.idReserva}/cancelar`, { method: 'DELETE', body: JSON.stringify({ motivoCancelamento: reason.trim() }) })
      onCancel(selected, reason.trim())
      setSelected(null)
      setReason('')
    } catch (error) {
      setCancelError(error.message)
    } finally {
      setCancelBusy(false)
    }
  }
  return <main className="inner-page">
    <div className="page-back"><ArrowLeft size={15} /> <span>PORTAL DO SOLICITANTE</span></div>
    <div className="section-top"><div><div className="eyebrow">SEU ESPAÇO, SEU HISTÓRICO</div><h1>Minhas <em>reservas</em></h1><p>Acompanhe cada encontro planejado no InPETU Hub.</p></div><div className="compact-filter"><Filter size={15} /><select value={filter} onChange={e => setFilter(e.target.value)}><option>Todas</option><option>Pendente</option><option>Confirmada</option><option>Cancelada</option></select><ChevronDown size={14} /></div></div>
    <div className="reservation-table-wrap"><table className="data-table"><thead><tr><th>Encontro</th><th>Espaço</th><th>Data e horário</th><th>Status</th><th>Ação</th></tr></thead><tbody>{list.map(item => {
      const cancellationAllowed = calendarDaysUntil(item.dataReserva) >= 15
      return <tr key={item.idReserva}><td><strong>{item.tituloEvento}</strong><small>Solicitação #{item.idReserva}</small></td><td>{item.espaco || starterSpaces.find(s => s.idEspaco === item.idEspaco)?.nomeEspaco || 'Espaço InPETU'}</td><td>{item.dataReserva} · {item.horarioInicio}–{item.horarioFim}{item.quantidadeParticipantes ? <small>{item.quantidadeParticipantes} visitantes</small> : null}</td><td><span className={`status-pill ${item.statusReserva === 'Confirmada' ? 'status-confirmed' : item.statusReserva === 'Cancelada' ? 'status-cancelled' : 'status-pending'}`}><i />{item.statusReserva}</span></td><td>{item.statusReserva !== 'Cancelada' && (cancellationAllowed ? <button className="table-action" onClick={() => { setSelected(item); setCancelError('') }}>Cancelar</button> : <small>Menos de 15 dias: solicite exceção à equipe.</small>)}</td></tr>
    })}</tbody></table>{list.length === 0 && <div className="empty-state"><CalendarDays size={25} /><p>Nenhuma reserva nesta categoria.</p></div>}</div>
    <Modal open={Boolean(selected)} close={() => { if (!cancelBusy) { setSelected(null); setCancelError('') } }} title="Cancelar solicitação">
      <div className="cancel-summary"><span>RESERVA #{selected?.idReserva}</span><strong>{selected?.tituloEvento}</strong><small>{selected?.dataReserva} · {selected?.horarioInicio}–{selected?.horarioFim}</small></div>
      <label className="reason-field">Motivo do cancelamento<textarea rows="4" required placeholder="Conte por que está cancelando esta reserva" value={reason} onChange={e => setReason(e.target.value)} /></label>
      <p className="form-footnote">O cancelamento exige pelo menos 15 dias de antecedência. Dentro desse prazo, somente a equipe pode autorizar uma exceção.</p>
      {cancelError && <p className="form-message" role="alert">{cancelError}</p>}
      <Button variant="danger" disabled={!reason.trim() || cancelBusy} onClick={cancel}>{cancelBusy ? 'Cancelando...' : 'Confirmar cancelamento'}</Button>
    </Modal>
  </main>
}
function HelpPage() {
  const [form, setForm] = useState({ emailContato: '', telefoneContato: '', mensagemDuvida: '' })
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  async function submit(event) { event.preventDefault(); setStatus(''); if (file && (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type) || file.size > 10 * 1024 * 1024)) return setStatus('Anexe PDF, PNG ou JPG de até 10 MB.'); try { if (file) { setProgress(35); } await request('/duvidas', { method: 'POST', body: JSON.stringify(form) }); setProgress(100); setStatus('Mensagem enviada. A equipe InPETU responderá pelo e-mail informado.'); setForm({ emailContato: '', telefoneContato: '', mensagemDuvida: '' }); setFile(null) } catch (error) { setStatus(error.message); setProgress(0) } }
  async function submit(event) { event.preventDefault(); setStatus(''); if (file && (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type) || file.size > 10 * 1024 * 1024)) return setStatus('Anexe PDF, PNG ou JPG de até 10 MB.'); try { if (file) await uploadQuestion(form, file, setProgress); else await request('/duvidas', { method: 'POST', body: JSON.stringify(form) }); setProgress(100); setStatus('Mensagem enviada. A equipe InPETU responderá pelo e-mail informado.'); setForm({ emailContato: '', telefoneContato: '', mensagemDuvida: '' }); setFile(null) } catch (error) { setStatus(error.message); setProgress(0) } }
  return <main className="inner-page help-page"><div className="help-intro"><div className="eyebrow">ESTAMOS POR PERTO</div><h1>Vamos conversar<br /><em>sobre sua ideia?</em></h1><p>Tem dúvidas sobre os espaços, eventos ou quer descobrir como fazer parte do ecossistema? Escreva para a gente.</p><div className="help-contact"><span><Mail size={17} /></span><div><small>FALE DIRETAMENTE</small><strong>inpetu@contato.ufsc.br</strong></div></div><div className="help-contact"><span><MapPin size={17} /></span><div><small>VENHA NOS VISITAR</small><strong>Lote 73 · Sapiens Parque, Florianópolis</strong></div></div></div><form className="help-form" onSubmit={submit}><div className="form-heading"><MessageCircle size={20} /><div><strong>Fale com a equipe</strong><small>Retornamos em até dois dias úteis.</small></div></div><label>Seu e-mail<input required type="email" value={form.emailContato} onChange={e => setForm({ ...form, emailContato: e.target.value })} /></label><label>Telefone <span>(opcional)</span><input type="tel" value={form.telefoneContato} onChange={e => setForm({ ...form, telefoneContato: e.target.value })} /></label><label>Sua mensagem<textarea required rows="5" maxLength="5000" value={form.mensagemDuvida} onChange={e => setForm({ ...form, mensagemDuvida: e.target.value })} placeholder="Como podemos ajudar?" /></label><label className="upload-box"><input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={e => setFile(e.target.files?.[0] || null)} /><span className="upload-icon"><Plus size={19} /></span><span><strong>{file ? file.name : 'Adicionar anexo'}</strong><small>PDF, PNG ou JPG · até 10 MB</small></span><span className="upload-action">Escolher arquivo</span></label>{progress > 0 && <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>}{status && <p className={status.startsWith('Mensagem') ? 'success-note' : 'form-message'}>{status}</p>}<Button type="submit">Enviar mensagem <ArrowRight size={16} /></Button><p className="form-footnote"><ShieldCheck size={14} /> Seus dados são protegidos pela política de privacidade UFSC.</p></form></main>
}
function CalendarPage({ spaces, onReserve, initialDate, initialKind, initialSpaceId, availabilityVersion }) {
  const [date, setDate] = useState(initialDate)
  const [kind, setKind] = useState(initialKind)
  const [monthCursor, setMonthCursor] = useState(() => new Date(`${initialDate}T12:00:00`))
  const [availability, setAvailability] = useState([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')
  const [availabilityReload, setAvailabilityReload] = useState(0)
  const typeOrder = ['Auditório', 'Sala de aula', 'Coworking', 'Sala de reunião', 'Visita guiada']
  const orderedSpaces = [...spaces].sort((left, right) => {
    const leftIndex = typeOrder.indexOf(left.tipoEspaco)
    const rightIndex = typeOrder.indexOf(right.tipoEspaco)
    return (leftIndex < 0 ? typeOrder.length : leftIndex) - (rightIndex < 0 ? typeOrder.length : rightIndex) ||
      left.nomeEspaco.localeCompare(right.nomeEspaco, 'pt-BR')
  })
  const filtered = orderedSpaces.filter(space => !kind || space.tipoEspaco === kind)
  const [selectedSpaceId, setSelectedSpaceId] = useState(initialSpaceId || '')
  const [calendarView, setCalendarView] = useState('Mensal')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [nextSlotSelection, setNextSlotSelection] = useState('start')
  const selectedSpace = filtered.find(space => String(space.idEspaco) === selectedSpaceId) || filtered[0]
  const spaceUnavailable = selectedSpace?.ativo === false
  const guidedTour = isGuidedTour(selectedSpace?.tipoEspaco)
  useEffect(() => {
    setStartTime('')
    setEndTime('')
    setNextSlotSelection('start')
  }, [date, selectedSpace?.idEspaco])
  useEffect(() => {
    if (!selectedSpace || !date || selectedSpace.ativo === false) {
      setAvailability([])
      setAvailabilityLoading(false)
      setAvailabilityError('')
      return
    }
    let active = true
    setAvailability([])
    setAvailabilityLoading(true)
    setAvailabilityError('')
    request(`/espacos/${selectedSpace.idEspaco}/agenda?data=${encodeURIComponent(date)}`)
      .then(data => { if (active) setAvailability(data) })
      .catch(error => { if (active) setAvailabilityError(error.message) })
      .finally(() => { if (active) setAvailabilityLoading(false) })
    return () => { active = false }
  }, [selectedSpace?.idEspaco, selectedSpace?.ativo, date, availabilityReload, availabilityVersion])
  const selectedDay = new Date(`${date}T12:00:00`)
  const slots = Array.from({ length: 28 }, (_, index) => {
    const totalMinutes = 8 * 60 + index * 30
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
  })
  const monday = new Date(selectedDay)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)
    return day
  })
  const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1, 12)
  const monthDays = Array.from({ length: new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate() }, (_, index) => {
    const day = new Date(monthStart)
    day.setDate(index + 1)
    return day
  })
  const displayDate = selectedDay.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const typeLabels = { 'Todos os espaços': 'Todos', 'Sala de aula': 'Salas de Aula', 'Sala de reunião': 'Salas de Reunião', 'Visita guiada': 'Visitas Guiadas' }
  function reservationAt(time) {
    const end = addMinutesToTime(time, 30)
    return availability.find(reservation => {
      const start = String(reservation.inicio).slice(0, 5)
      const finish = String(reservation.fim).slice(0, 5)
      return time < finish && end > start
    })
  }
  function isRangeAvailable(start, end) {
    if (!start || !end || end <= start || start < '08:00' || end > '22:00') return false
    for (let cursor = start; cursor < end; cursor = addMinutesToTime(cursor, 30)) {
      if (reservationAt(cursor)) return false
    }
    return true
  }
  const canRequestReservation = !spaceUnavailable && date >= localDateValue() && !availabilityLoading && !availabilityError &&
    (guidedTour || isRangeAvailable(startTime, endTime))
  function selectStartTime(time) {
    setStartTime(time)
    setEndTime('')
    setNextSlotSelection('end')
  }
  function selectSlotTime(time) {
    if (nextSlotSelection === 'start' || !startTime || endTime) {
      selectStartTime(time)
      return
    }
    if (time > startTime) {
      setEndTime(time)
      setNextSlotSelection('start')
      return
    }
    if (time < startTime) selectStartTime(time)
  }
  function updateStartTime(time) {
    setStartTime(time)
    setNextSlotSelection('end')
  }
  function updateEndTime(time) {
    setEndTime(time)
    setNextSlotSelection('start')
  }
  function selectDate(day) {
    const value = localDateValue(day)
    setDate(value)
    setMonthCursor(new Date(`${value}T12:00:00`))
  }
  function changeDate(value) {
    setDate(value)
    if (value) setMonthCursor(new Date(`${value}T12:00:00`))
  }
  function moveMonth(offset) {
    setMonthCursor(current => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12))
  }
  function goToToday() {
    const today = new Date()
    const value = localDateValue(today)
    setDate(value)
    setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1, 12))
  }
  function dateButton(day, compact = false) {
    const value = localDateValue(day)
    const isSelected = value === date
    const isToday = value === localDateValue()
    return <button key={value} type="button" disabled={value < localDateValue()} className={`calendar-date-option ${isSelected ? 'calendar-date-selected' : ''} ${isToday ? 'calendar-date-today' : ''} ${compact ? 'calendar-date-compact' : ''}`} onClick={() => selectDate(day)} aria-current={isToday ? 'date' : undefined} aria-pressed={isSelected}>
      {compact ? <><small>{day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</small><strong>{day.getDate()}</strong></> : day.getDate()}
    </button>
  }
  const orderedTypes = [...new Set(orderedSpaces.map(space => space.tipoEspaco))]
  return <main className="inner-page catalog-page">
    <div className="catalog-heading"><h1>Catálogo de Espaços e Disponibilidade</h1><p>{guidedTour ? 'Escolha a data e solicite uma visita guiada. A equipe confirmará o horário e a disponibilidade do guia.' : 'Consulte os horários livres do Lote 73 e solicite sua reserva em poucos cliques.'}</p></div>
    <section className={`catalog-controls ${guidedTour ? 'catalog-controls-guided' : ''}`} aria-label="Filtros de disponibilidade">
      <div className="catalog-categories">{['Todos os espaços', ...orderedTypes].map(type => <button key={type} type="button" className={`catalog-category ${kind === (type === 'Todos os espaços' ? '' : type) ? 'catalog-category-active' : ''}`} onClick={() => setKind(type === 'Todos os espaços' ? '' : type)}>{typeLabels[type] || type}</button>)}</div>
      <div className="catalog-fields">
        <label><span>Espaço</span><select value={selectedSpace ? String(selectedSpace.idEspaco) : ''} onChange={event => setSelectedSpaceId(event.target.value)}>{filtered.map(space => <option key={space.idEspaco} value={space.idEspaco}>{space.nomeEspaco}</option>)}</select></label>
        {!guidedTour && <><label><span>Início</span><input type="time" min="08:00" max="21:30" step="1800" value={startTime} onChange={event => updateStartTime(event.target.value)} /></label>
          <label><span>Término</span><input type="time" min={startTime ? addMinutesToTime(startTime, 30) : '08:30'} max="22:00" step="1800" value={endTime} onChange={event => updateEndTime(event.target.value)} /></label></>}
        <label><span>Data</span><input type="date" min={localDateValue()} value={date} onChange={event => changeDate(event.target.value)} /></label>
      </div>
      {guidedTour && <div className="catalog-guided-notice" role="note">A visita exige aprovação da equipe; o primeiro pedido, porém, reserva o horário enquanto aguarda análise.</div>}
      {!guidedTour && <div className="catalog-view-row">
        <div className="catalog-view-tabs" role="group" aria-label="Visualização do calendário">{['Mensal', 'Semanal', 'Diário'].map(view => <button key={view} type="button" className={calendarView === view ? 'catalog-view-active' : ''} onClick={() => setCalendarView(view)} aria-pressed={calendarView === view}>{view}</button>)}</div>
        <div className="catalog-legend"><span><i className="legend-free" /> Livre</span><span><i className="legend-busy" /> Ocupado</span><span><i className="legend-pending" /> Em análise</span></div>
      </div>}
      {!guidedTour && calendarView === 'Semanal' && <div className="calendar-date-picker calendar-week-picker" aria-label="Escolha um dia da semana">{weekDates.map(day => dateButton(day, true))}</div>}
      {!guidedTour && calendarView === 'Mensal' && <div className="calendar-date-picker calendar-month-picker" aria-label="Escolha um dia do mês"><div className="calendar-month-heading"><button type="button" aria-label="Mês anterior" disabled={monthCursor.getFullYear() === new Date().getFullYear() && monthCursor.getMonth() <= new Date().getMonth()} onClick={() => moveMonth(-1)}><ChevronLeft size={17} /></button><strong className="calendar-month-label">{monthCursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label="Próximo mês" onClick={() => moveMonth(1)}><ChevronRight size={17} /></button><button type="button" className="calendar-today-button" onClick={goToToday}>Hoje</button></div>{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => <span key={`${day}-${index}`} className="calendar-weekday">{day}</span>)}{Array.from({ length: monthStart.getDay() }, (_, index) => <span key={`empty-${index}`} className="calendar-date-empty" />)}{monthDays.map(day => dateButton(day))}</div>}
    </section>
    {selectedSpace ? <>
      <article className="catalog-space-card">
        <div className="catalog-space-photo"><img src={selectedSpace.arquivoImagem ? withDb(`${API}/espacos/${selectedSpace.idEspaco}/imagem`) : images[selectedSpace.tipoEspaco] || images.Coworking} alt="" />{spaceUnavailable && <span className="space-unavailable-overlay">INDISPONÍVEL</span>}</div>
        <div className="catalog-space-info"><small>{selectedSpace.tipoEspaco}</small><h2>{selectedSpace.nomeEspaco}</h2><span><Users size={15} /> Até {selectedSpace.capacidadePessoas || 20} pessoas</span>{selectedSpace.exigeAprovacaoManual && <em>{guidedTour ? 'Confirmação pela equipe' : 'Requer análise manual'}</em>}{spaceUnavailable && <p className="space-unavailable-reason"><strong>Motivo:</strong> {selectedSpace.motivoIndisponibilidade || 'Este espaço está temporariamente indisponível.'}<small className="unavailable-deadline">{unavailableDeadlineLabel(selectedSpace.dataPrevisaoRetorno)}</small></p>}</div>
        <Button icon={CalendarDays} disabled={!canRequestReservation} onClick={() => onReserve(selectedSpace, date, guidedTour ? '' : startTime, guidedTour ? '' : endTime)}>{guidedTour ? 'Solicitar visita guiada' : 'Solicitar Reserva'}</Button>
      </article>
      <section className="catalog-slots"><h2>{guidedTour ? 'Disponibilidade da visita' : `Horários de ${displayDate}`}</h2>{spaceUnavailable ? <div className="catalog-space-unavailable-message" role="alert"><strong>Espaço indisponível</strong><span>{selectedSpace.motivoIndisponibilidade || 'Este espaço está temporariamente indisponível.'}</span></div> : guidedTour ? <div className="catalog-guided-detail"><p>Informe data, horário e tamanho do grupo no pedido. O horário fica reservado pela ordem de solicitação, mesmo enquanto a equipe analisa a visita.</p>{availabilityLoading ? <p className="catalog-availability-message" role="status">Consultando disponibilidade...</p> : availabilityError ? <div className="catalog-availability-error" role="alert"><span>Não foi possível consultar os horários ocupados: {availabilityError}</span><button type="button" onClick={() => setAvailabilityReload(value => value + 1)}>Tentar novamente</button></div> : availability.length ? <p><strong>Horários já reservados ou em análise:</strong> {availability.map(reservation => `${String(reservation.inicio).slice(0, 5)}–${String(reservation.fim).slice(0, 5)}`).join(', ')}</p> : <p>Nenhum horário reservado nesta data.</p>}</div> : <><p className="catalog-time-help">{nextSlotSelection === 'end' && startTime ? `Início às ${startTime} selecionado. Agora clique em outro horário livre para definir o término.` : 'Clique em um horário livre para definir o início e, em seguida, em outro para definir o término. Também pode preencher os campos acima.'}</p>{availabilityLoading ? <p className="catalog-availability-message" role="status">Consultando disponibilidade...</p> : availabilityError ? <div className="catalog-availability-error" role="alert"><span>Não foi possível consultar a disponibilidade: {availabilityError}</span><button type="button" onClick={() => setAvailabilityReload(value => value + 1)}>Tentar novamente</button></div> : <div className="catalog-slot-grid">{slots.map(time => {
        const reservation = reservationAt(time)
        const status = reservation ? (reservation.statusReserva === 'Pendente' ? 'slot-pending' : 'slot-busy') : 'slot-free'
        const statusLabel = reservation ? (reservation.statusReserva === 'Pendente' ? 'Em análise' : 'Ocupado') : 'Livre'
        const isSelectedStart = time === startTime
        const isSelectedRange = startTime && endTime && time >= startTime && time < endTime
        const canSelectAsEnd = nextSlotSelection === 'end' && startTime && time > startTime
        return <button key={time} type="button" className={`time-slot ${status} ${isSelectedRange && !reservation ? 'slot-selected-range' : ''} ${isSelectedStart ? 'slot-selected-start' : ''} ${time === endTime ? 'slot-selected-end' : ''}`} disabled={Boolean(reservation) && !canSelectAsEnd} onClick={() => selectSlotTime(time)} aria-label={`${time}, ${statusLabel}${isSelectedStart ? ', início selecionado' : ''}${time === endTime ? ', término selecionado' : ''}`}>
          <strong>{time}</strong><span>{statusLabel}</span>
        </button>
      })}</div>}{!availabilityLoading && !availabilityError && <>{startTime && endTime && endTime <= startTime && <p className="catalog-time-error" role="alert">O término deve ser depois do horário de início.</p>}{startTime && endTime > startTime && !canRequestReservation && <p className="catalog-time-error" role="alert">O período escolhido inclui um horário ocupado ou em análise.</p>}<p className="calendar-note">Funcionamento: 08h–22h. Horários ocupados ou em análise não podem ser reservados.</p></>}</>}</section>
    </> : <div className="catalog-empty">Nenhum espaço disponível para esse tipo.</div>}
  </main>
}
function Crm({ user, setUser, onReturnHome, spaces, setSpaces, reservations, setReservations }) {
  const [section, setSection] = useState('Visão geral')
  const [dashboardDate, setDashboardDate] = useState(localDateValue())
  const [partners, setPartners] = useState(initialPartners)
  const [clientUsers, setClientUsers] = useState([])
  const [clientProfile, setClientProfile] = useState(null)
  const [clientTab, setClientTab] = useState('Dados gerais')
  const [drawer, setDrawer] = useState(null)
  const [level, setLevel] = useState('')
  const [reason, setReason] = useState('')
  const [registrationToRemove, setRegistrationToRemove] = useState(null)
  const [organizationActionError, setOrganizationActionError] = useState('')
  const [organizationActionBusy, setOrganizationActionBusy] = useState(false)
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
  const notify = text => { setToast(text); window.setTimeout(() => setToast(''), 3200) }
  useEffect(() => {
    if (!localStorage.getItem('inpetu-token')) return
    Promise.all([request('/reservas'), request('/usuarios'), request('/organizacoes'), request('/duvidas'), request('/auditoria')]).then(([bookings, users, organizations, questions, logs]) => {
      const orgById = new Map(organizations.map(org => [org.idOrganizacao, org]))
      const userById = new Map(users.map(person => [person.idUsuario, person]))
      setReservations(bookings.map(item => ({ ...item, espaco: spaces.find(space => space.idEspaco === item.idEspaco)?.nomeEspaco || 'Espaço InPETU', tipoEspaco: spaces.find(space => space.idEspaco === item.idEspaco)?.tipoEspaco, solicitante: userById.get(item.idSolicitante)?.nomeCompleto || 'Solicitante', persona: userById.get(item.idSolicitante)?.idPersona })))
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
        const actionLabels = { CADASTRO_CRIADO: 'Criação de cadastro', CLASSIFICACAO: 'Classificação', PERSONA_USO: 'Alteração de persona', ALTERACAO_PERFIL: 'Alteração de perfil', ALTERACAO_STATUS: 'Alteração de status', EXCLUSAO_CADASTRO: 'Exclusão de cadastro', DESCREDENCIAMENTO: 'Descredenciamento', CRIACAO: 'Criação de reserva', EDICAO: 'Edição de reserva', NEGOCIACAO_COTA: 'Negociação de cota', APROVACAO: 'Aprovação', CANCELAMENTO: 'Cancelamento' }
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
  function logout() { localStorage.removeItem('inpetu-token'); localStorage.removeItem('inpetu-user'); setUser(null) }
  async function approve(item) {
    if (item.excedeCota && !item.dataNegociacao) {
      setNegotiationTarget(item)
      setNegotiationNote('')
      setNegotiationError('')
      return
    }
    try {
      const updated = await request(`/reservas/${item.idReserva}/aprovar`, { method: 'POST' })
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
  }
  async function cancelReservationByTeam() {
    if (!reservationCancelTarget || !reservationCancelReason.trim() || reservationCancelBusy) return
    setReservationCancelBusy(true)
    setReservationCancelError('')
    try {
      await request(`/reservas/${reservationCancelTarget.idReserva}/cancelar`, {
        method: 'DELETE',
        body: JSON.stringify({ motivoCancelamento: reservationCancelReason.trim() }),
      })
      const target = reservationCancelTarget
      setReservations(items => items.map(item => item.idReserva === target.idReserva
        ? { ...item, statusReserva: 'Cancelada', motivoCancelamento: reservationCancelReason.trim() }
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
  async function removeRegistration() {
    const target = registrationToRemove
    if (!target || !reason.trim() || organizationActionBusy) return
    setOrganizationActionBusy(true)
    setOrganizationActionError('')
    try {
      await request(`/usuarios/${target.userId}/cadastro`, { method: 'DELETE', body: JSON.stringify({ motivo: reason.trim() }) })
      setPartners(items => items.filter(partner => partner.userId !== target.userId))
      setRegistrationToRemove(null)
      setReason('')
      notify('Cadastro e acesso desativados. Motivo registrado na auditoria.')
    } catch (error) {
      setOrganizationActionError(error.message)
    } finally {
      setOrganizationActionBusy(false)
    }
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
      setClientUsers(items => [created, ...items])
      setNewRegistration({ nomeCompleto: '', email: '', telefone: '', organizacao: '', cargoVinculo: '', senha: '' })
      setRegistrationCreateOpen(false)
      notify('Cadastro criado e registrado na auditoria.')
    } catch (error) {
      setRegistrationCreateError(error.message)
    } finally {
      setRegistrationCreateBusy(false)
    }
  }
  async function classify() {
    if (!level || !drawer) return
    try {
      const updated = await request(`/usuarios/${drawer.userId || drawer.id}/persona`, { method: 'PUT', body: JSON.stringify({ idPersona: Number(level) }) })
      setPartners(items => items.map(person => person.userId === updated.idUsuario
        ? { ...person, status: 'Persona definida', persona: updated.idPersona }
        : person))
      setClientUsers(items => items.map(person => person.idUsuario === updated.idUsuario ? updated : person))
      setReservations(items => items.map(item => item.idSolicitante === updated.idUsuario ? { ...item, persona: updated.idPersona } : item))
      setDrawer(null)
      setLevel('')
      notify('Persona de uso atualizada e registrada na auditoria.')
    } catch (error) {
      notify(error.message)
    }
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
    const rows = [['Organização', 'Responsável', 'E-mail', 'Persona de uso']]
    filteredPartners.forEach(person => rows.push([person.name, person.contact, person.email, person.persona ? `P${person.persona} · ${personas[person.persona]?.label || ''}` : 'Aguardando persona']))
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
  if (!user) return <div className="crm-login"><div className="crm-login-visual"><Logo inverse /><div><div className="eyebrow">INPETU HUB · UFSC</div><h1>O ecossistema,<br /><em>em movimento.</em></h1><p>Gestão inteligente dos encontros e espaços do Lote 73.</p><div className="crm-location"><MapPin size={17} />Sapiens Parque · Florianópolis</div></div><small>AMBIENTE DE GESTÃO INTERNA</small></div><div className="crm-login-form"><button type="button" className="crm-return-home" onClick={onReturnHome}><ArrowLeft size={16} /> Voltar ao site inicial</button><div className="eyebrow">ACESSO RESTRITO · EQUIPE INPETU</div><h2>Acesso ao painel</h2><p>Entre com sua conta da equipe para gerenciar reservas, espaços e cadastros.</p><LoginInline onLogin={setUser} /></div></div>
  return <div className="crm-layout"><aside className="crm-sidebar"><button className="crm-logo-button" onClick={() => setSection('Visão geral')}><Logo /></button><div className="workspace-label">ESPAÇO DE TRABALHO</div><nav className="crm-nav">{nav.map(({ name, icon: Icon }) => <button key={name} className={section === name ? 'crm-nav-active' : ''} onClick={() => setSection(name)}><Icon size={18} /><span>{name}</span>{name === 'Reservas' && pending.length > 0 && <b>{pending.length}</b>}</button>)}</nav><div className="sidebar-spacer" /><button type="button" className="crm-return-home crm-sidebar-return" onClick={onReturnHome}><HomeIcon size={16} /> Voltar ao site inicial</button><div className="sidebar-help"><span><CircleHelp size={17} /></span><strong>Chamados de usuários</strong><small>Acompanhe e responda pedidos de suporte.</small><button onClick={() => { setSection('Atendimento'); setSelectedTicket(pendingQuestions[0] || tickets[0] || null) }}>Abrir chamados <ArrowRight size={14} /></button></div><button className="profile-button" onClick={logout}><span className="avatar">{(user.nome || 'Equipe').slice(0, 1)}</span><span><strong>{user.nome || 'Equipe InPETU'}</strong><small>{user.perfil === 1 ? 'Coordenador' : 'Equipe InPETU'}</small></span><MoreHorizontal size={18} /></button></aside>
    <main className="crm-main"><header className="crm-topbar"><div className="breadcrumbs"><span>InPETU Connect</span><span>/</span><strong>{section}</strong></div><label className="global-search"><Search size={16} /><input placeholder="Buscar em tudo" value={search} onChange={e => setSearch(e.target.value)} /><kbd>⌘ K</kbd></label><NotificationCenter user={user} /><button className="crm-icon" aria-label="Ajuda"><CircleHelp size={18} /></button><span className="crm-avatar">{(user.nome || 'E').slice(0, 1)}</span></header>
      <div className="crm-content">{crmDataError && <div className="form-message" role="alert">{crmDataError}</div>}{section === 'Visão geral' && <><div className="crm-greeting"><div><div className="eyebrow">{selectedDateLabel}</div><h1>Bom dia, {user.nome?.split(' ')[0] || 'equipe'} {isDashboardToday && <span>☀</span>}</h1><p>{isDashboardToday ? 'O Lote 73 está em movimento. Veja o que precisa de atenção.' : 'Visualizando reservas e ocupação desta data.'}</p></div><div className="date-navigation" aria-label="Navegação da agenda"><button type="button" className="date-step" aria-label="Dia anterior" onClick={() => shiftDashboardDate(-1)}><ChevronLeft size={16} /></button><label className="date-button"><CalendarDays size={16} /><span>{isDashboardToday ? 'Hoje · ' : ''}{selectedDay.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}</span><input aria-label="Selecionar data da agenda" type="date" value={dashboardDate} onChange={event => setDashboardDate(event.target.value)} /></label><button type="button" className="date-step" aria-label="Próximo dia" onClick={() => shiftDashboardDate(1)}><ChevronRight size={16} /></button>{!isDashboardToday && <button type="button" className="date-today" onClick={() => setDashboardDate(todayKey)}>Hoje</button>}</div></div><div className="kpi-grid"><Kpi icon={CalendarDays} label="Reservas no dia" value={String(selectedReservations.length).padStart(2, '0')} change={`${occupiedSpaces.size} espaços com agenda nesta data`} accent="mint" /><Kpi icon={Clock3} label="Aguardando aprovação" value={String(pending.length).padStart(2, '0')} change="Precisam da sua atenção" accent="yellow" /><Kpi icon={DoorOpen} label="Ocupação do Lote 73" value={`${occupancyRate}%`} change={`${occupiedSpaces.size} de ${activeSpaces.length} espaços ocupados nesta data`} accent="blue" /><Kpi icon={MessageCircle} label="Dúvidas em aberto" value={String(pendingQuestions.length).padStart(2, '0')} change={`${tickets.length} chamados recebidos`} accent="coral" /></div><div className="dashboard-columns"><section className="crm-panel conflict-panel"><div className="panel-heading"><div><div className="eyebrow">DECISÃO NECESSÁRIA · {selectedDay.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase()}</div><h2>Solicitações pendentes <span className="heading-count">{selectedPending.length}</span></h2></div><button className="subtle-action" onClick={() => setSection('Reservas')}>Ver todas <ArrowRight size={15} /></button></div>{selectedPending.length ? selectedPending.map(item => <div className="conflict-card" key={item.idReserva}><div className="conflict-card-top"><span className="conflict-icon"><CalendarDays size={16} /></span><span className="conflict-date">{new Date(`${item.dataReserva}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase()} · {item.horarioInicio}–{item.horarioFim}</span><span className="pending-indicator">EM ANÁLISE</span></div><strong>{item.tituloEvento}</strong><div className="conflict-meta"><span>{item.espaco}</span><span className="meta-dot" />{item.solicitante}<Badge level={item.persona} /></div><div className="conflict-actions"><button className="decision-button" onClick={() => approve(item)}><Check size={15} /> Aprovar solicitação</button><button className="decision-secondary" onClick={() => notify('Solicite um motivo antes de recusar esta reserva.')}>Recusar</button></div></div>) : <div className="empty-inline"><Check size={18} />Nenhuma solicitação pendente nesta data.</div>}</section><section className="crm-panel today-panel"><div className="panel-heading"><div><div className="eyebrow">{isDashboardToday ? 'HOJE NO HUB' : selectedDay.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase()}</div><h2>Agenda do dia</h2></div><button className="icon-button" onClick={() => setSection('Reservas')} aria-label="Abrir agenda"><ArrowUpRight size={18} /></button></div>  <div className="day-timeline">{selectedReservations.map(item => <div className="timeline-event" key={item.idReserva}><span>{item.horarioInicio}</span><i className={`timeline-mark ${item.statusReserva === 'Pendente' ? 'pendente' : ''}`} /><div><strong>{item.tituloEvento}</strong><small>{item.espaco || 'Espaço InPETU'} · {item.statusReserva}</small></div></div>)}{selectedReservations.length === 0 && <div className="empty-inline">Nenhuma reserva nesta data.</div>}</div><button className="full-width-link" onClick={() => setSection('Reservas')}>Abrir agenda completa <ArrowRight size={15} /></button></section></div><section className="crm-panel recent-panel"><div className="panel-heading"><div><div className="eyebrow">VISÃO DO ECOSSISTEMA</div><h2>Cadastros recentes</h2></div><button className="subtle-action" onClick={() => setSection('Cadastros')}>Gerenciar cadastros <ArrowRight size={15} /></button></div><table className="data-table"><thead><tr><th>Organização</th><th>Contato principal</th><th>Cadastro</th><th>Classificação</th><th /></tr></thead><tbody>{partners.slice(0, 3).map(p => <tr key={p.id}><td><strong>{p.name}</strong><small>{p.email}</small></td><td>{p.contact}</td><td>Hoje · 09:42</td><td>{p.persona ? <Badge level={p.persona} /> : <span className="awaiting-label">Aguardando</span>}</td><td><button className="table-more" onClick={() => { setDrawer(p); setLevel(String(p.persona || '')) }}><MoreHorizontal size={19} /></button></td></tr>)}</tbody></table></section></>}
        {section === 'Reservas' && <>
          <CrmTitle eyebrow="AGENDA DO HUB" title="Reservas" description="Revise solicitações e acompanhe a ocupação dos espaços." />
          <div className="crm-panel">
            <div className="panel-heading"><div><div className="eyebrow">FILA DE APROVAÇÃO</div><h2>{pending.length} solicitações pendentes</h2></div><button type="button" className="subtle-action" aria-expanded={reservationFiltersOpen} onClick={() => setReservationFiltersOpen(value => !value)}><Filter size={15} /> {reservationFiltersOpen ? 'Ocultar filtros' : 'Filtrar'}</button></div>
            {reservationFiltersOpen && <div className="crm-filter-panel" aria-label="Filtros de reservas"><label>Status<select value={reservationStatusFilter} onChange={event => setReservationStatusFilter(event.target.value)}><option>Todas</option><option>Pendente</option><option>Confirmada</option><option>Cancelada</option><option>Excede cota</option></select></label><label>Data<input type="date" value={reservationDateFilter} onChange={event => setReservationDateFilter(event.target.value)} /></label><label>Espaço<select value={reservationSpaceFilter} onChange={event => setReservationSpaceFilter(event.target.value)}><option value="">Todos os espaços</option>{spaces.map(space => <option key={space.idEspaco} value={space.idEspaco}>{space.nomeEspaco}</option>)}</select></label><button type="button" className="table-action" onClick={() => { setReservationStatusFilter('Todas'); setReservationDateFilter(''); setReservationSpaceFilter('') }}>Limpar filtros</button></div>}
            <div className="crm-filter-count">{filteredReservations.length} de {reservations.length} reservas</div>
            <div className="crm-reservations">{filteredReservations.map(item => {
              const day = item.dataReserva ? new Date(`${item.dataReserva}T12:00:00`) : null
              return <div className="crm-reservation" key={item.idReserva}>
                <div className="res-date-block"><strong>{day?.toLocaleDateString('pt-BR', { day: '2-digit' }) || '--'}</strong><small>{day?.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase() || ''}</small></div>
                <div className="crm-res-main"><strong>{item.tituloEvento}</strong><small>{item.espaco} · {item.horarioInicio}–{item.horarioFim} · {item.solicitante}{item.quantidadeParticipantes ? ` · ${item.quantidadeParticipantes} visitantes` : ''}</small></div>
                <Badge level={item.persona} />
                {item.excedeCota && <span className="quota-exceeded-badge">Excede cota · negociar</span>}
                <span className={`status-pill ${item.statusReserva === 'Confirmada' ? 'status-confirmed' : item.statusReserva === 'Cancelada' ? 'status-cancelled' : 'status-pending'}`}><i />{item.statusReserva}</span>
                {item.statusReserva === 'Pendente' && <button className="decision-button compact-decision" onClick={() => approve(item)}><Check size={14} /> {item.excedeCota && !item.dataNegociacao ? 'Negociar' : 'Aprovar'}</button>}
                {item.statusReserva !== 'Cancelada' && <button className="table-action" onClick={() => editReservation(item)}>Editar</button>}
                {item.statusReserva !== 'Cancelada' && <button className="table-action table-action-danger" onClick={() => { setReservationCancelTarget(item); setReservationCancelReason(''); setReservationCancelError('') }}>Cancelar</button>}
              </div>
            })}</div>
          </div>
        </>}
        {section === 'Cadastros' && <><CrmTitle eyebrow="REDE INPETU" title="Cadastros e ficha do cliente" description="Consulte a ficha técnica, o histórico de reservas e atribua uma persona P1–P6." action={<Button icon={Plus} onClick={() => { setRegistrationCreateError(''); setRegistrationCreateOpen(true) }}>Novo cadastro</Button>} /><div className="crm-panel"><div className="panel-heading"><div className="segmented-control"><button type="button" className={partnerScope === 'all' ? 'segment-active' : ''} aria-pressed={partnerScope === 'all'} onClick={() => setPartnerScope('all')}>Todos os cadastros</button><button type="button" className={partnerScope === 'pending' ? 'segment-active' : ''} aria-pressed={partnerScope === 'pending'} onClick={() => setPartnerScope('pending')}>Aguardando persona <span>{partners.filter(p => !p.persona).length}</span></button></div><button type="button" className="subtle-action" onClick={exportPartners}><Download size={15} /> Exportar CSV</button></div><table className="data-table"><thead><tr><th>Organização</th><th>Responsável</th><th>E-mail</th><th>Persona e cota mensal</th><th>Ações</th></tr></thead><tbody>{filteredPartners.map(p => { const persona = personas[p.persona]; const hours = monthlyQuotaUsed(reservations, p.userId); return <tr key={p.userId || p.id}><td><strong>{p.name}</strong><small>{p.dataCadastro ? new Date(p.dataCadastro).toLocaleDateString('pt-BR') : 'Cadastro sem data'}</small></td><td>{p.contact}</td><td>{p.email}</td><td>{persona ? <><Badge level={p.persona} /><small>{persona.quota == null ? 'Sem cota mensal definida' : `${hours.toFixed(1).replace('.', ',')} / ${persona.quota} horas neste mês`}</small></> : <span className="awaiting-label">Aguardando persona</span>}</td><td><button className="table-action" onClick={() => { const client = clientUsers.find(person => person.idUsuario === p.userId); setClientProfile(client || null); setClientTab('Dados gerais') }}>Abrir ficha</button><button className="table-action" onClick={() => { setDrawer(p); setLevel(String(p.persona || '')) }}>{p.persona ? 'Alterar persona' : 'Definir persona'}</button>{user.perfil === 1 && <button type="button" className="table-action table-action-danger" onClick={() => { setRegistrationToRemove(p); setReason(''); setOrganizationActionError('') }}>Desativar cadastro</button>}</td></tr> })}</tbody></table></div><div className="privacy-callout"><ShieldCheck size={18} /><span><strong>Dados internos</strong><small>A persona, o consumo de cota e os dados da ficha ficam disponíveis apenas para a equipe autorizada.</small></span></div></>}
        {section === 'Espaços' && <><CrmTitle eyebrow="LOTE 73 · SAPIENS PARQUE" title="Gestão de espaços" description="Mantenha o catálogo de ambientes atualizado e disponível." action={<Button icon={Plus} onClick={() => setSpaceModal(true)}>Novo espaço</Button>} /><div className="crm-panel"><table className="data-table"><thead><tr><th>Espaço</th><th>Tipo</th><th>Capacidade</th><th>Disponibilidade</th><th>Ativo</th></tr></thead><tbody>{spaces.map(space => <tr key={space.idEspaco}><td><strong>{space.nomeEspaco}</strong><small>{space.equipamentosDisponiveis}</small></td><td>{space.tipoEspaco}</td><td>{space.capacidadePessoas} pessoas</td><td>{space.ativo !== false ? <span className="availability-text"><i /> Disponível</span> : <span className="availability-text availability-unavailable"><i /> Indisponível<small>{space.motivoIndisponibilidade}</small><small>{unavailableDeadlineLabel(space.dataPrevisaoRetorno)}</small></span>}</td><td><button className={`toggle ${space.ativo !== false ? 'toggle-on' : ''}`} aria-label={`${space.ativo !== false ? 'Inativar' : 'Reativar'} ${space.nomeEspaco}`} aria-pressed={space.ativo !== false} onClick={() => toggleSpace(space)}><span /></button></td></tr>)}</tbody></table></div></>}
        {section === 'Atendimento' && <><CrmTitle eyebrow="CENTRAL DE ATENDIMENTO" title="Dúvidas e mensagens" description="Acompanhe os contatos recebidos pelo portal público." /><div className="support-grid"><div className="crm-panel support-list"><div className="panel-heading"><div><div className="eyebrow">CAIXA DE ENTRADA</div><h2>{pendingQuestions.length} {pendingQuestions.length === 1 ? 'conversa aberta' : 'conversas abertas'}</h2></div><label className="ticket-filter">Status<select aria-label="Filtrar conversas por status" value={ticketStatusFilter} onChange={event => setTicketStatusFilter(event.target.value)}><option>Todas</option><option>Abertas</option><option>Respondidas</option></select></label></div>{filteredTickets.length ? filteredTickets.slice().sort((left, right) => new Date(right.dataEnvio).getTime() - new Date(left.dataEnvio).getTime()).map(ticket => <button className={`ticket-row ${selectedTicket?.idDuvida === ticket.idDuvida ? 'ticket-selected' : ''}`} key={ticket.idDuvida} onClick={() => setSelectedTicket(ticket)}><span className="ticket-avatar">{ticket.emailContato.split('@')[0].split(/[._-]/).map(part => part[0]).join('').slice(0, 2).toUpperCase()}</span><span><strong>{ticket.emailContato}</strong><small>{ticket.mensagemDuvida}</small><em>{new Date(ticket.dataEnvio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</em></span></button>) : <div className="empty-state"><MessageCircle size={24} /><p>Nenhuma conversa recebida.</p></div>}</div><div className="crm-panel ticket-detail">{selectedTicket ? <><div className="ticket-detail-head"><div><span className={`status-pill ${selectedTicket.statusAtendimento === 'Respondida' ? 'status-confirmed' : 'status-pending'}`}><i />{selectedTicket.statusAtendimento}</span><small>{new Date(selectedTicket.dataEnvio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small></div>{selectedTicket.caminhoAnexo && <a className="table-action" href={`${API}/duvidas/${selectedTicket.idDuvida}/anexo`} target="_blank" rel="noreferrer"><Download size={15} /> Anexo</a>}</div><h2>{selectedTicket.emailContato}</h2><p>{selectedTicket.mensagemDuvida}</p>{selectedTicket.telefoneContato && <div className="ticket-sender"><span className="ticket-avatar">{selectedTicket.emailContato.split('@')[0].slice(0, 2).toUpperCase()}</span><span><strong>Telefone para retorno</strong><small>{selectedTicket.telefoneContato}</small></span></div>}<label>Sua resposta<textarea rows="5" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Escreva uma resposta para enviar por e-mail..." /></label><Button disabled={!answer.trim()} onClick={sendAnswer}><Mail size={16} /> Enviar resposta por e-mail</Button></> : <div className="empty-state"><MessageCircle size={24} /><p>Nenhuma dúvida recebida.</p></div>}</div></div></>
        }
        {section === 'Auditoria' && <><CrmTitle eyebrow="TRANSPARÊNCIA E CONTROLE" title="Histórico de ações" description="Acompanhe quem fez cada alteração, quando aconteceu e qual registro foi afetado." /><div className="crm-panel audit-panel"><div className="audit-toolbar"><label className="audit-search"><Search size={17} /><input type="search" value={auditQuery} onChange={event => setAuditQuery(event.target.value)} placeholder="Buscar por responsável, ação ou registro" aria-label="Buscar no histórico de auditoria" /></label><label className="audit-filter-label">Ação<select value={auditActionFilter} onChange={event => setAuditActionFilter(event.target.value)} aria-label="Filtrar por ação"><option>Todas</option>{auditActions.map(action => <option key={action}>{action}</option>)}</select></label><span className="audit-result-count">{filteredAuditItems.length} {filteredAuditItems.length === 1 ? 'registro' : 'registros'}</span></div><div className="audit-table-wrap"><table className="data-table audit-table"><thead><tr><th>Data e hora</th><th>Responsável</th><th>Ação</th><th>Registro afetado</th><th>Detalhes</th></tr></thead><tbody>{filteredAuditItems.map((item, i) => <tr key={`${item.time}-${item.user}-${i}`}><td><span className="audit-time">{item.time}</span></td><td><strong className="audit-actor">{item.user}</strong></td><td><span className="audit-action"><i />{item.action}</span></td><td><strong className="audit-target">{item.target}</strong></td><td className="audit-detail">{item.detail}</td></tr>)}</tbody></table>{filteredAuditItems.length === 0 && <div className="audit-empty"><ListChecks size={22} /><strong>{auditItems.length ? 'Nenhum registro encontrado' : 'Ainda não há ações registradas'}</strong><span>{auditItems.length ? 'Tente ajustar a busca ou o filtro selecionado.' : 'As alterações realizadas pela equipe aparecerão aqui.'}</span></div>}</div></div></>}
        {section === 'Equipe' && user.perfil === 1 && <><CrmTitle eyebrow="ACESSO RESTRITO · COORDENADOR" title="Equipe e permissões" description="Gerencie colaboradores e papéis de acesso ao InPETU Connect." /><div className="crm-panel"><table className="data-table"><thead><tr><th>Colaborador</th><th>E-mail</th><th>Perfil</th><th>Status</th><th /></tr></thead><tbody>{staff.map(person => { const isCurrentUser = person.email?.toLowerCase() === user.email?.toLowerCase(); return <tr key={person.idUsuario}><td><strong>{person.nomeCompleto}</strong><small>{person.cargoVinculo}</small></td><td>{person.email}</td><td>{['', 'Coordenador', 'Gestor de Espaços', 'Staff/Atendente'][person.idPerfil]}</td><td><span className={`status-pill ${person.ativo ? 'status-confirmed' : 'status-cancelled'}`}><i />{person.ativo ? 'Ativo' : 'Inativo'}</span></td><td>{isCurrentUser ? <span className="table-action-disabled" title="Você não pode alterar seu próprio perfil">Seu perfil</span> : <button className="table-action" onClick={() => setRoleTarget({ ...person })}>Gerenciar papel</button>}</td></tr> })}</tbody></table></div></>}
      </div></main>{toast && <div className="toast"><Check size={17} />{toast}</div>}
    <Modal open={Boolean(reservationCancelTarget)} close={() => { if (!reservationCancelBusy) { setReservationCancelTarget(null); setReservationCancelError('') } }} title="Cancelar reserva">
      <div className="cancel-summary"><span>RESERVA #{reservationCancelTarget?.idReserva}</span><strong>{reservationCancelTarget?.tituloEvento}</strong><small>{reservationCancelTarget?.dataReserva} · {reservationCancelTarget?.horarioInicio}–{reservationCancelTarget?.horarioFim}</small></div>
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
        <label>Espaço<select value={reservationEditForm.idEspaco} onChange={event => setReservationEditForm({ ...reservationEditForm, idEspaco: event.target.value })}>{spaces.map(space => <option key={space.idEspaco} value={space.idEspaco}>{space.nomeEspaco}</option>)}</select></label>
        <label>Data<input required type="date" value={reservationEditForm.dataReserva} onChange={event => setReservationEditForm({ ...reservationEditForm, dataReserva: event.target.value })} /></label>
        <div className="form-row"><label>Início<input required type="time" value={reservationEditForm.horarioInicio} onChange={event => setReservationEditForm({ ...reservationEditForm, horarioInicio: event.target.value })} /></label><label>Fim<input required type="time" value={reservationEditForm.horarioFim} onChange={event => setReservationEditForm({ ...reservationEditForm, horarioFim: event.target.value })} /></label></div>
        {isGuidedTour(spaces.find(space => Number(space.idEspaco) === Number(reservationEditForm.idEspaco))?.tipoEspaco) && <label>Quantidade de visitantes<input required type="number" min="1" value={reservationEditForm.quantidadeParticipantes} onChange={event => setReservationEditForm({ ...reservationEditForm, quantidadeParticipantes: event.target.value })} /></label>}
        {reservationEditError && <p className="form-message" role="alert">{reservationEditError}</p>}
        <Button type="submit" disabled={reservationEditBusy}>{reservationEditBusy ? 'Salvando...' : 'Salvar alterações'} <Check size={16} /></Button>
      </form>}
    </Modal>
    <Modal open={Boolean(negotiationTarget)} close={() => { if (!negotiationBusy) { setNegotiationTarget(null); setNegotiationError('') } }} title="Negociar excedente de cota">
      <div className="quota-negotiation-callout"><strong>{negotiationTarget?.solicitante} · P{negotiationTarget?.persona}</strong><span>{negotiationTarget?.tituloEvento}</span><small>Registre o contato e o resultado da negociação com o solicitante. A reserva só poderá ser aprovada depois desse registro.</small></div>
      <label className="reason-field">Contato e resultado da negociação<textarea rows="5" required maxLength={4000} value={negotiationNote} onChange={event => setNegotiationNote(event.target.value)} placeholder="Informe quando e como o solicitante foi contatado e qual foi o acordo." /></label>
      {negotiationError && <p className="form-message" role="alert">{negotiationError}</p>}
      <Button disabled={!negotiationNote.trim() || negotiationBusy} onClick={recordNegotiationAndApprove}>{negotiationBusy ? 'Registrando...' : 'Registrar negociação e aprovar'} <Check size={16} /></Button>
    </Modal>
    <ClientProfileDialog client={clientProfile} reservations={reservations} tickets={tickets} auditItems={auditItems} close={() => setClientProfile(null)} />
    <Modal open={Boolean(drawer)} close={() => setDrawer(null)} title="Definir persona de uso"><p className="access-intro">A persona determina a cota mensal de horas. Essa classificação é interna e só fica visível para a equipe.</p><div className="classify-org"><span className="org-avatar">{drawer?.name?.slice(0, 1)}</span><span><strong>{drawer?.name}</strong><small>{drawer?.contact} · {drawer?.email}</small></span></div><label className="role-select-label">Persona do cliente<select value={level} onChange={event => setLevel(event.target.value)}><option value="">Selecione P1–P6</option>{Object.entries(personas).map(([id, item]) => <option key={id} value={id}>P{id} · {item.label}{item.quota == null ? ' · sem cota mensal' : ` · ${item.quota} h/mês`}</option>)}</select></label><Button disabled={!level} onClick={classify}>Salvar persona <Check size={16} /></Button></Modal>
    <Modal open={Boolean(roleTarget)} close={() => { if (!roleSaveBusy) { setRoleTarget(null); setRoleSaveError('') } }} title="Gerenciar papel">{roleTarget && <><div className="classify-org"><span className="org-avatar">{roleTarget.nomeCompleto?.slice(0, 1)}</span><span><strong>{roleTarget.nomeCompleto}</strong><small>{roleTarget.email}</small></span></div><label className="role-select-label">Perfil de acesso<select value={roleTarget.idPerfil} onChange={event => { setRoleTarget({ ...roleTarget, idPerfil: Number(event.target.value) }); setRoleSaveError('') }}><option value="1">Coordenador</option><option value="2">Gestor de Espaços</option><option value="3">Staff / Atendente</option></select></label>{roleSaveError && <p className="form-message" role="alert">{roleSaveError}</p>}<Button disabled={roleSaveBusy || Number(roleTarget.idPerfil) === staff.find(person => person.idUsuario === roleTarget.idUsuario)?.idPerfil} onClick={saveRole}>{roleSaveBusy ? 'Salvando...' : 'Salvar papel'} <Check size={16} /></Button></>}</Modal>
    <Modal open={Boolean(registrationToRemove)} close={() => { if (!organizationActionBusy) { setRegistrationToRemove(null); setReason(''); setOrganizationActionError('') } }} title="Excluir cadastro"><div className="danger-callout"><ShieldCheck size={18} /><span><strong>Esta a&ccedil;&atilde;o ser&aacute; registrada</strong><small>Somente este cadastro e o acesso do respons&aacute;vel ser&atilde;o desativados. O hist&oacute;rico da organiza&ccedil;&atilde;o ser&aacute; preservado.</small></span></div><p className="access-intro">Respons&aacute;vel: <strong>{registrationToRemove?.contact}</strong><br />E-mail: {registrationToRemove?.email}</p><label className="reason-field">Motivo da exclus&atilde;o<textarea rows="4" maxLength={1000} required value={reason} onChange={event => { setReason(event.target.value); setOrganizationActionError('') }} placeholder="Descreva o motivo da exclus&atilde;o deste cadastro" /></label>{organizationActionError && <p className="form-message" role="alert">{organizationActionError}</p>}<Button variant="danger" disabled={!reason.trim() || organizationActionBusy} onClick={removeRegistration}>{organizationActionBusy ? 'Excluindo...' : 'Confirmar exclus\u00e3o'}</Button></Modal>
    <Modal open={registrationCreateOpen} close={() => { if (!registrationCreateBusy) { setRegistrationCreateOpen(false); setRegistrationCreateError('') } }} title="Criar cadastro para uma organização">
      <form className="form-stack" onSubmit={createRegistration}>
        <p className="access-intro">Cadastre a organização e uma pessoa responsável. A pessoa entrará usando e-mail e senha.</p>
        <label>Nome da organização<input required maxLength={100} value={newRegistration.organizacao} onChange={event => setNewRegistration({ ...newRegistration, organizacao: event.target.value })} /></label>
        <label>Nome do responsável<input required maxLength={100} value={newRegistration.nomeCompleto} onChange={event => setNewRegistration({ ...newRegistration, nomeCompleto: event.target.value })} /></label>
        <label>E-mail<input required type="email" maxLength={100} value={newRegistration.email} onChange={event => setNewRegistration({ ...newRegistration, email: event.target.value })} /></label>
        <div className="form-row">
          <label>Telefone (opcional)<input type="tel" maxLength={20} value={newRegistration.telefone} onChange={event => setNewRegistration({ ...newRegistration, telefone: event.target.value })} /></label>
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
function LoginInline({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  async function submit(event) { event.preventDefault(); setError(''); try { const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha: password }) }); localStorage.setItem('inpetu-token', result.token); localStorage.setItem('inpetu-user', JSON.stringify(result)); onLogin(result) } catch (e) { setError(e.message) } }
  return <form className="form-stack" onSubmit={submit}><label>E-mail corporativo<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@inpetuhub.ufsc.br" /></label><label>Senha<input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" /></label>{error && <p className="form-message">{error}</p>}<Button type="submit">Acessar painel <ArrowRight size={16} /></Button><p className="form-footnote"><ShieldCheck size={14} /> Acesso protegido por autenticação segura.</p></form>
}
function Kpi({ icon: Icon, label, value, change, accent }) { return <article className="kpi-card"><div className={`kpi-icon kpi-${accent}`}><Icon size={18} /></div><span className="kpi-label">{label}</span><strong className="kpi-value">{value}</strong><small>{change}</small><ArrowUpRight className="kpi-trend" size={16} /></article> }
function CrmTitle({ eyebrow, title, description, action }) { return <div className="crm-title-row"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div> }
function ClientProfileDialog({ client, reservations, tickets, auditItems, close }) {
  const [tab, setTab] = useState('Dados gerais')
  if (!client) return null
  const persona = personas[client.idPersona]
  const clientReservations = reservations.filter(item => item.idSolicitante === client.idUsuario)
    .sort((left, right) => right.dataReserva.localeCompare(left.dataReserva))
  const clientTickets = tickets.filter(item => item.emailContato?.toLowerCase() === client.email?.toLowerCase())
  const clientAudit = auditItems.filter(item => item.target.includes(`#${client.idUsuario}`))
  const hours = monthlyQuotaUsed(reservations, client.idUsuario)
  const fields = [
    ['E-mail', client.email || '—'],
    ['Telefone / WhatsApp', client.telefone || 'Não informado'],
    ['Organização', client.organizacao || 'Não informada'],
    ['Vínculo / cargo', client.cargoVinculo || 'Não informado'],
    ['Data de cadastro', client.dataCadastro ? new Date(client.dataCadastro).toLocaleString('pt-BR') : '—'],
    ['Status', client.ativo === false ? 'Inativo' : 'Ativo'],
  ]
  return <Modal open={Boolean(client)} close={close} title={client.nomeCompleto} wide>
    <p className="client-profile-intro">Ficha técnica unificada 360° — dados, histórico e trilha de auditoria LGPD.</p>
    <div className="client-profile-tabs" role="tablist" aria-label="Seções da ficha do cliente">
      {['Dados gerais', `Reservas (${clientReservations.length})`, `Dúvidas (${clientTickets.length})`, 'Auditoria'].map(label => {
        const name = label.split(' (')[0]
        return <button key={name} type="button" role="tab" aria-selected={tab === name} className={tab === name ? 'client-profile-tab-active' : ''} onClick={() => setTab(name)}>{label}</button>
      })}
    </div>
    <div className="client-profile-content">
      {tab === 'Dados gerais' && <>
        <section className="client-persona-callout">
          <strong><ShieldCheck size={16} /> PERSONA DE USO INTERNA</strong>
          <span>{persona ? `P${client.idPersona} · ${persona.label}` : 'Persona ainda não definida'}</span>
          <small>{!persona ? 'Defina a persona para calcular a cota e avaliar solicitações excedentes.' : persona.quota == null ? 'Sem cota mensal definida na tabela.' : `${hours.toFixed(1).replace('.', ',')} de ${persona.quota} horas utilizadas/reservadas neste mês.`}</small>
          <small>Informação exclusiva da equipe; não é exibida ao solicitante.</small>
        </section>
        <div className="client-profile-grid">{fields.map(([label, value]) => <div className="client-profile-field" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      </>}
      {tab === 'Reservas' && <div className="client-history-list">{clientReservations.length ? clientReservations.map(item => <article key={item.idReserva}><div><strong>{item.tituloEvento}</strong><small>{item.dataReserva} · {item.horarioInicio}–{item.horarioFim} · {item.espaco || 'Espaço InPETU'}</small></div><span className={`status-pill ${item.statusReserva === 'Confirmada' ? 'status-confirmed' : item.statusReserva === 'Cancelada' ? 'status-cancelled' : 'status-pending'}`}><i />{item.statusReserva}</span>{item.excedeCota && <span className="quota-exceeded-badge">Excede cota</span>}</article>) : <p className="empty-inline">Este cliente ainda não possui reservas.</p>}</div>}
      {tab === 'Dúvidas' && <div className="client-history-list">{clientTickets.length ? clientTickets.map(ticket => <article key={ticket.idDuvida}><div><strong>{ticket.statusAtendimento} · {new Date(ticket.dataEnvio).toLocaleDateString('pt-BR')}</strong><small>{ticket.mensagemDuvida}</small>{ticket.respostaEquipe && <small>Resposta da equipe: {ticket.respostaEquipe}</small>}</div></article>) : <p className="empty-inline">Nenhuma dúvida vinculada a este e-mail.</p>}</div>}
      {tab === 'Auditoria' && <div className="client-history-list">{clientAudit.length ? clientAudit.map((item, index) => <article key={`${item.time}-${index}`}><div><strong>{item.action} · {item.time}</strong><small>{item.user} · {item.detail}</small></div></article>) : <p className="empty-inline">Nenhum registro de auditoria deste cliente.</p>}</div>}
    </div>
  </Modal>
}
function Footer({ setView }) { return <footer className="site-footer"><div className="footer-main"><div><Logo inverse /><p>Espaço para ideias. Conexões para transformar.</p></div><div className="footer-links"><span>EXPLORE</span><button onClick={() => setView('home')}>Espaços</button><button onClick={() => setView('calendar')}>Disponibilidade</button><button onClick={() => setView('help')}>Fale conosco</button></div><div className="footer-address"><span>ENCONTRE A GENTE</span><p><MapPin size={15} /> Sapiens Parque · Lote 73<br />Rod. SC-401, 6001 · Florianópolis, SC</p><a href="https://maps.google.com/?q=Sapiens+Parque+Florianopolis" target="_blank" rel="noreferrer">Abrir mapa <ExternalLink size={13} /></a></div></div><div className="footer-bottom"><span>© 2026 InPETU Hub · UFSC</span><span><ShieldCheck size={14} /> Seus dados tratados com transparência, conforme a LGPD.</span><span>Ciência que aproxima. <span className="footer-heart">✳</span></span></div></footer> }
function AppInner() {
  const [view, setView] = useState('home')
  const [spaces, setSpaces] = useState(starterSpaces)
  const [reservations, setReservations] = useState(initialReservations)
  const [myReservations, setMyReservations] = useState([])
  const [bookingSpace, setBookingSpace] = useState(null)
  const [bookingSchedule, setBookingSchedule] = useState({ date: localDateValue(), time: '09:00' })
  const [bookingEndTime, setBookingEndTime] = useState('10:00')
  const [calendarQuery, setCalendarQuery] = useState({ date: '', kind: '', spaceId: '' })
  const [availabilityVersion, setAvailabilityVersion] = useState(0)
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('inpetu-user')) } catch { return null } })
  function openBooking(space, date = localDateValue(), time = '09:00', endTime = addMinutesToTime(time, 30)) {
    setBookingSchedule({ date, time })
    setBookingEndTime(endTime)
    setBookingSpace(space)
  }
  function showSpaceAvailability(space) {
    setCalendarQuery({ date: localDateValue(), kind: space.tipoEspaco, spaceId: String(space.idEspaco) })
    setView('calendar')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function openCalendar() {
    setCalendarQuery({ date: localDateValue(), kind: '', spaceId: '' })
    setView('calendar')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  useEffect(() => { request('/espacos').then(data => data?.length && setSpaces(data)).catch(() => { }) }, [])
  useEffect(() => { if (localStorage.getItem('inpetu-token')) request('/reservas/minhas').then(setMyReservations).catch(() => { }) }, [user])
  function updateCancel(item, reason) {
    const update = items => items.map(r => r.idReserva === item.idReserva ? { ...r, statusReserva: 'Cancelada', motivoCancelamento: reason } : r)
    setReservations(update); setMyReservations(update)
  }
  function updateSaved(reserva) {
    const saved = { ...reserva, espaco: bookingSpace?.nomeEspaco, solicitante: user?.nome || 'Você' }
    setReservations(items => [saved, ...items]); setMyReservations(items => [saved, ...items])
    setAvailabilityVersion(version => version + 1)
  }
  if (view === 'crm') return <Crm user={user} setUser={setUser} onReturnHome={() => { setView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} spaces={spaces} setSpaces={setSpaces} reservations={reservations} setReservations={setReservations} />
  return <div className="public-app"><Header view={view} setView={setView} openLogin={() => setView('access')} onOpenCalendar={openCalendar} user={user} />{view === 'home' && <Home spaces={spaces} onConsultSpace={showSpaceAvailability} setSignupOpen={() => setView('signup')} onOpenCalendar={openCalendar} onSearchAvailability={(date, kind) => { setCalendarQuery({ date, kind, spaceId: '' }); setView('calendar'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />}{view === 'calendar' && <CalendarPage spaces={spaces} onReserve={openBooking} initialDate={calendarQuery.date || localDateValue()} initialKind={calendarQuery.kind} initialSpaceId={calendarQuery.spaceId} availabilityVersion={availabilityVersion} />}{view === 'reservations' && <ReservationsPage items={myReservations} onCancel={updateCancel} />}{view === 'help' && <HelpPage />}{view === 'access' && <AccessPage onLogin={result => { setUser(result); setView(result.perfil === 1 || result.perfil === 2 || result.perfil === 3 ? 'crm' : 'reservations') }} onSignup={() => setView('signup')} />}{view === 'signup' && <SignupPage onBack={() => setView('access')} />}{!['access', 'signup'].includes(view) && <Footer setView={setView} />}<BookingModal space={bookingSpace} close={() => setBookingSpace(null)} onSaved={updateSaved} openLogin={() => setView('access')} initialDate={bookingSchedule.date} initialTime={bookingSchedule.time} initialEndTime={bookingEndTime} /></div>
}

function DbSwitch() {
  const [info, setInfo] = useState(null)
  const current = getDb()
  useEffect(() => { request('/database').then(setInfo).catch(() => { }) }, [])
  useEffect(() => {
    if (info && !info.testeDisponivel && current === 'test') { localStorage.setItem('inpetu-db', 'main'); window.location.reload() }
  }, [info, current])
  if (!info?.testeDisponivel) return null
  function change(next) {
    if (next === current) return
    localStorage.setItem('inpetu-db', next)
    localStorage.removeItem('inpetu-token'); localStorage.removeItem('inpetu-user')
    window.location.reload()
  }
  return <>
    {current === 'test' && <div className="db-banner" role="status">AMBIENTE DE TESTE · os dados deste banco são fictícios e separados do principal</div>}
    <div className="db-switch" role="group" aria-label="Banco de dados">
      <span>Banco</span>
      <button type="button" className={current === 'main' ? 'db-on' : ''} onClick={() => change('main')} aria-pressed={current === 'main'}>Principal</button>
      <button type="button" className={current === 'test' ? 'db-on db-on-test' : ''} onClick={() => change('test')} aria-pressed={current === 'test'}>Teste</button>
    </div>
  </>
}

export default function App() {
  return <><AppInner /><DbSwitch /></>
}
