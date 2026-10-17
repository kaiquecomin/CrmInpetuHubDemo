import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems, Tab, TabGroup, TabList, TabPanel, TabPanels, Transition, TransitionChild } from '@headlessui/react'
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bell, Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, DoorOpen, Download, Eye, EyeOff, ExternalLink, FileText, Filter, GraduationCap, Home as HomeIcon, LayoutDashboard, ListChecks, LockKeyhole, Mail, MapPin, Menu as MenuIcon, MessageCircle, MoreHorizontal, Plus, Search, ShieldCheck, SlidersHorizontal, Users, X } from 'lucide-react'
import { personas, personaQuotaLabel } from './personas.js'
import { formatRelativeNotificationDate, normalizeNotificationMessage } from './notifications.js'
import { BRAND_LOGOS } from './brand.js'
import { Reveal } from './motion/index.js'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'
const omitPersona = user => {
  if (!user) return user
  const { idPersona, persona, ...safeUser } = user
  return safeUser
}
const getStoredUser = () => {
  try { return omitPersona(JSON.parse(localStorage.getItem('inpetu-user') || 'null')) } catch { return null }
}
const storeUser = user => localStorage.setItem('inpetu-user', JSON.stringify(omitPersona(user)))
const clearStoredUser = () => localStorage.removeItem('inpetu-user')
const isCrmUser = user => [1, 2, 3].includes(Number(user?.perfil ?? user?.idPerfil))
const LOGIN_RETURN_VIEW_KEY = 'inpetu-login-return-view'
const internalViews = new Set(['calendar', 'reservations'])
const routeViews = {
  '/meu-portal': 'portal',
  '/minhas-reservas': 'reservations',
  '/agendar': 'calendar',
  '/login': 'access',
  '/cadastro': 'signup',
  '/contato': 'help',
}
const viewPaths = {
  home: '/?view=home',
  portal: '/meu-portal',
  reservations: '/minhas-reservas',
  calendar: '/agendar',
  access: '/login',
  signup: '/cadastro',
  help: '/contato',
  'password-change': '/?view=password-change',
  crm: '/?legacyAdmin=1',
}
const getDefaultView = () => {
  const storedUser = getStoredUser()
  return storedUser?.senhaTemporaria ? 'password-change' : storedUser ? (isCrmUser(storedUser) ? 'crm' : 'portal') : 'home'
}
const rememberLoginDestination = view => {
  if (internalViews.has(view)) sessionStorage.setItem(LOGIN_RETURN_VIEW_KEY, view)
}
const consumeLoginDestination = () => {
  const view = sessionStorage.getItem(LOGIN_RETURN_VIEW_KEY)
  sessionStorage.removeItem(LOGIN_RETURN_VIEW_KEY)
  return internalViews.has(view) ? view : null
}
const phoneDigits = value => {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2)
  return digits.slice(0, 11)
}
const formatBrazilianPhone = value => {
  const digits = phoneDigits(value)
  if (digits.length < 2) return digits
  const areaCode = digits.slice(0, 2)
  const subscriber = digits.slice(2)
  if (!subscriber) return `(${areaCode})`
  const prefixLength = digits.length > 10 ? 5 : 4
  if (subscriber.length <= prefixLength) return `(${areaCode}) ${subscriber}`
  return `(${areaCode}) ${subscriber.slice(0, prefixLength)}-${subscriber.slice(prefixLength)}`
}
const isValidBrazilianMobile = value => /^\(\d{2}\) 9\d{4}-\d{4}$/.test(String(value || ''))
const reservationStatusLabel = status => status === 'Confirmada' ? 'Aprovado' : status
const reservationStatusClass = status => status === 'Confirmada' ? 'status-confirmed' : status === 'Cancelada' ? 'status-cancelled' : 'status-pending'
const isGuidedTour = type => type?.trim().toLocaleLowerCase('pt-BR') === 'visita guiada'
const normalizeRoomName = value => value?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR') || ''
const roomPhotoSets = {
  auditorio: ['/images/rooms/auditorio/01_auditorio_1.jpg', '/images/rooms/auditorio/02_auditorio_2.jpg'],
  'sala-reuniao': ['/images/rooms/sala-reuniao/03_sala-reuniao_1.jpg'],
  coworking: ['/images/rooms/coworking/04_coworking_1.jpg'],
  'sala-reuniao-1-coworking': ['/images/rooms/sala-reuniao-1-coworking/05_sala-reuniao-1-coworking_1.jpg'],
  'sala-reuniao-2-coworking': ['/images/rooms/sala-reuniao-2-coworking/06_sala-reuniao-2-coworking_1.jpg'],
  'sala-pre-incubacao': ['/images/rooms/sala-pre-incubacao/07_sala-pre-incubacao_1.jpg', '/images/rooms/sala-pre-incubacao/08_sala-pre-incubacao_2.jpg', '/images/rooms/sala-pre-incubacao/09_sala-pre-incubacao_3.jpg'],
  'sala-maker-via': ['/images/rooms/sala-maker-via/10_sala-maker-via_1.jpg', '/images/rooms/sala-maker-via/11_sala-maker-via_2.jpg', '/images/rooms/sala-maker-via/12_sala-maker-via_3.jpg'],
  'sala-via-hub': ['/images/rooms/sala-via-hub/13_sala-via-hub_1.jpg', '/images/rooms/sala-via-hub/14_sala-via-hub_2.jpg', '/images/rooms/sala-via-hub/15_sala-via-hub_3.jpg'],
  'sala-distrito-inovacao': ['/images/rooms/sala-distrito-inovacao/16_sala-distrito-inovacao_1.jpg', '/images/rooms/sala-distrito-inovacao/17_sala-distrito-inovacao_2.jpg', '/images/rooms/sala-distrito-inovacao/18_sala-distrito-inovacao_3.jpg'],
}
const roomPhotos = {
  'auditorio': roomPhotoSets.auditorio[0],
  'auditorio principal': roomPhotoSets.auditorio[0],
  'sala de reuniao': roomPhotoSets['sala-reuniao'][0],
  'coworking': roomPhotoSets.coworking[0],
  'area de coworking': roomPhotoSets.coworking[0],
  'sala de reuniao 1 (coworking)': roomPhotoSets['sala-reuniao-1-coworking'][0],
  'sala de reuniao 1': roomPhotoSets['sala-reuniao-1-coworking'][0],
  'sala de reuniao 2 (coworking)': roomPhotoSets['sala-reuniao-2-coworking'][0],
  'sala de reuniao 2': roomPhotoSets['sala-reuniao-2-coworking'][0],
  'sala pre-incubacao': roomPhotoSets['sala-pre-incubacao'][0],
  'sala maker via': roomPhotoSets['sala-maker-via'][0],
  'sala via hub': roomPhotoSets['sala-via-hub'][0],
  'sala distrito de inovacao': roomPhotoSets['sala-distrito-inovacao'][0],
}
const imageByType = {
  'auditorio': roomPhotos.auditorio,
  'sala de aula': roomPhotos['sala de reuniao'],
  'sala de reuniao': roomPhotos['sala de reuniao'],
  'coworking': roomPhotos.coworking,
  'visita guiada': roomPhotos.auditorio,
}
const getRoomImage = space => roomPhotos[normalizeRoomName(space?.nomeEspaco)]
  || roomPhotos[normalizeRoomName(space?.arquivoImagem?.replace(/\.(jpe?g|png|webp)$/i, '').replaceAll('-', ' '))]
  || imageByType[normalizeRoomName(space?.tipoEspaco)]
  || (space?.arquivoImagem ? `${API}/espacos/${space.idEspaco}/imagem` : roomPhotos.coworking)
const getRoomImages = space => {
  const name = normalizeRoomName(space?.nomeEspaco)
  const type = normalizeRoomName(space?.tipoEspaco)
  const roomKey = {
    'auditorio principal': 'auditorio',
    'sala de reuniao': 'sala-reuniao',
    'area de coworking': 'coworking',
    'sala de reuniao 1 (coworking)': 'sala-reuniao-1-coworking',
    'sala de reuniao 1': 'sala-reuniao-1-coworking',
    'sala de reuniao 2 (coworking)': 'sala-reuniao-2-coworking',
    'sala de reuniao 2': 'sala-reuniao-2-coworking',
    'sala pre-incubacao': 'sala-pre-incubacao',
    'sala maker via': 'sala-maker-via',
    'sala via hub': 'sala-via-hub',
    'sala distrito de inovacao': 'sala-distrito-inovacao',
  }[name] || name
  if (roomPhotoSets[roomKey]) return roomPhotoSets[roomKey]
  const typeKey = { auditorio: 'auditorio', 'sala de aula': 'sala-reuniao', 'sala de reuniao': 'sala-reuniao', coworking: 'coworking', 'visita guiada': 'auditorio' }[type]
  return typeKey ? roomPhotoSets[typeKey] : [getRoomImage(space)]
}
const getRoomInitials = user => (user?.nome || user?.email || 'U')
  .split(/[\s@._-]+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part[0].toLocaleUpperCase('pt-BR'))
  .join('')
const localDateValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const saoPauloDateTime = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}
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
  const isFormData = options.body instanceof FormData
  const headers = { ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  let response
  try {
    response = await fetch(`${API}${path}`, { ...options, credentials: 'include', headers })
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
  if (response.status === 401 && path === '/auth/login') {
    throw new Error('E-mail ou senha incorretos. Confirme que está usando uma conta cadastrada.')
  }
  if (response.status === 403 && path === '/auth/login') {
    throw new Error('A API bloqueou o login (HTTP 403). Atualize o site e a API para a mesma versão e verifique as permissões da conta.')
  }
  if (!response.ok) {
    const error = new Error(body?.detail || body?.message || body?.mensagem || body?.title || body?.error || `Falha na solicitação (HTTP ${response.status}).`)
    error.status = response.status
    throw error
  }
  return body
}
function uploadQuestion(data, file, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('dados', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    form.append('anexo', file)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API}/duvidas`)
    xhr.withCredentials = true
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
function Logo({ variant = 'horizontalLight', className = '' }) {
  return <img className={`brand-logo brand-logo-${variant} ${className}`} src={BRAND_LOGOS[variant]} alt="InPETU hub" />
}
function Button({ children, variant = 'primary', icon: Icon, className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{Icon && <Icon size={17} strokeWidth={1.8} />}{children}</button>
}
function PhoneInput({ value, onChange, ...props }) {
  function handleChange(event) {
    const digits = phoneDigits(event.currentTarget.value)
    event.currentTarget.value = formatBrazilianPhone(digits)
    onChange(digits)
  }

  return <input
    {...props}
    type="tel"
    inputMode="numeric"
    autoComplete="tel"
    maxLength={15}
    placeholder="(48) 99999-9999"
    value={formatBrazilianPhone(value)}
    onChange={handleChange}
  />
}
function PasswordInput(props) {
  const [visible, setVisible] = useState(false)
  return <div className="password-input-wrap">
    <input {...props} type={visible ? 'text' : 'password'} />
    <button
      type="button"
      className="password-input-toggle"
      aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
      aria-pressed={visible}
      onClick={() => setVisible(current => !current)}
    >
      {visible ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  </div>
}
export function Title({ as: Tag = 'h2', children, className, ...props }) {
  return <Tag className={className} {...props}>{children}</Tag>
}
function Modal({ open, close, title, children, wide = false }) {
  return <Transition appear show={open} as={Fragment}><Dialog as="div" className="dialog-root" onClose={close}>
    <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="dialog-backdrop" /></TransitionChild>
    <div className="dialog-wrap"><TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-3" enterTo="opacity-100 translate-y-0" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-3"><DialogPanel className={`dialog-panel ${wide ? 'dialog-wide' : ''}`}>
      <div className="dialog-heading"><DialogTitle as={Title} className="dialog-title">{title}</DialogTitle><button className="icon-button" aria-label="Fechar" onClick={close}><X size={19} /></button></div>{children}
    </DialogPanel></TransitionChild></div>
  </Dialog></Transition>
}
function RoomPhoto({ space, alt, className = '' }) {
  return <img
    className={className}
    src={getRoomImage(space)}
    alt={alt || space?.nomeEspaco || 'Espaço do InPETU Hub'}
    onError={event => {
      const image = event.currentTarget
      if (!image.dataset.fallbackApplied) {
        image.dataset.fallbackApplied = 'true'
        image.src = roomPhotos.coworking
      }
    }}
  />
}
const notificationIcons = {
  RESERVA_CRIADA: CalendarDays,
  RESERVA_APROVADA: Check,
  RESERVA_CANCELADA: X,
  COTA_EXCEDIDA: CircleHelp,
}
function NotificationCenter({ user }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useRef(null)
  useEffect(() => {
    if (!user) {
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
  useEffect(() => {
    if (!open) return
    function closeWhenOutside(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeWhenOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeWhenOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])
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
  return <div className="notification-center" ref={containerRef}>
    <button type="button" className="notification-trigger" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ''}`} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <Bell size={19} />{unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <section className="notification-popover" aria-label="Notificações">
      <div className="notification-heading"><strong>Notificações</strong><div><button type="button" onClick={markAllRead} disabled={!unread}>Marcar todas como lidas</button><button type="button" className="notification-close" aria-label="Fechar notificações" onClick={() => setOpen(false)}><X size={16} /></button></div></div>
      {error && <p className="notification-error" role="alert">{error}</p>}
      {items.length ? <div className="notification-list">{items.slice(0, 12).map(item => {
        const Icon = notificationIcons[item.tipo] || Bell
        const typeClass = String(item.tipo || 'geral').toLocaleLowerCase('pt-BR').replaceAll('_', '-')
        return <button type="button" key={item.idNotificacao} className={`notification-item ${item.lida ? '' : 'notification-unread'}`} onClick={() => markRead(item)}>
        <span className={`notification-type-icon notification-type-${typeClass}`} aria-hidden="true"><Icon size={18} /></span>
        <span><strong>{item.titulo}</strong><small>{normalizeNotificationMessage(item.mensagem)}</small><time dateTime={item.dataHora} title={new Date(item.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}>{formatRelativeNotificationDate(item.dataHora)}</time>{item.statusEmail !== 'ENVIADO' && <em>E-mail {item.statusEmail === 'DESATIVADO' ? 'desativado' : 'não enviado: verifique a configuração de envio'}</em>}</span>
        {!item.lida && <i aria-label="Não lida" />}
      </button>
      })}</div> : <p className="notification-empty">Você não tem notificações.</p>}
    </section>}
  </div>
}
const avatarPhotoCache = new Map()
const avatarPhotoLoads = new Map()
const avatarPhotoFailures = new Set()

function releaseAvatarPhoto(entry) {
  entry.references = Math.max(0, entry.references - 1)
  if (entry.references === 0 && entry.objectUrl) {
    URL.revokeObjectURL(entry.objectUrl)
    entry.objectUrl = ''
  }
}

async function loadAvatarPhoto(userId, version) {
  const cacheKey = String(userId)
  const requestKey = `${cacheKey}:${version}`
  const existingLoad = avatarPhotoLoads.get(requestKey)
  if (existingLoad) return existingLoad

  const previous = avatarPhotoCache.get(cacheKey)
  const headers = previous?.etag ? { 'If-None-Match': previous.etag } : {}
  const loading = fetch(`${API}/usuarios/${encodeURIComponent(userId)}/foto`, {
    credentials: 'include',
    headers,
  }).then(async response => {
    if (response.status === 304 && previous?.blob) {
      previous.version = version
      return previous
    }
    if (response.status === 404) {
      avatarPhotoFailures.add(requestKey)
      return null
    }
    if (!response.ok) throw new Error(`Falha ao carregar a foto (HTTP ${response.status}).`)
    const entry = {
      version,
      etag: response.headers.get('ETag') || '',
      blob: await response.blob(),
      objectUrl: '',
      references: 0,
    }
    avatarPhotoCache.set(cacheKey, entry)
    avatarPhotoFailures.delete(requestKey)
    return entry
  }).finally(() => avatarPhotoLoads.delete(requestKey))
  avatarPhotoLoads.set(requestKey, loading)
  return loading
}

export function Avatar({ user, id, nome, tamanho = 40, className = '' }) {
  const userId = id ?? user?.idUsuario
  const name = nome || user?.nomeCompleto || user?.nome || user?.email || 'Usuário'
  const hasPhoto = Boolean(user?.temFoto ?? user?.hasPhoto)
  const version = String(user?.fotoVersao ?? user?.fotoAtualizadaEm ?? 0)
  const [photo, setPhoto] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    let acquired = null
    setFailed(false)
    if (!userId || !hasPhoto) {
      setPhoto('')
      return undefined
    }
    const cacheKey = String(userId)
    const requestKey = `${cacheKey}:${version}`
    const cached = avatarPhotoCache.get(cacheKey)

    function useEntry(entry) {
      if (!active || !entry) return
      if (!entry.objectUrl) entry.objectUrl = URL.createObjectURL(entry.blob)
      entry.references++
      acquired = entry
      setPhoto(entry.objectUrl)
    }

    if (cached?.version === version) {
      if (cached.invalid) {
        setPhoto('')
        setFailed(true)
      }
      else if (cached.blob) useEntry(cached)
      else setPhoto('')
    } else if (avatarPhotoFailures.has(requestKey)) {
      setPhoto('')
      setFailed(true)
    } else {
      setPhoto('')
      loadAvatarPhoto(userId, version).then(entry => {
        if (entry) useEntry(entry)
        else if (active) {
          setPhoto('')
          setFailed(true)
        }
      }).catch(() => {
        if (active) {
          avatarPhotoFailures.add(requestKey)
          setPhoto('')
          setFailed(true)
        }
      })
    }

    return () => {
      active = false
      if (acquired) releaseAvatarPhoto(acquired)
    }
  }, [userId, hasPhoto, version])

  function failPhoto() {
    if (photo) {
      avatarPhotoFailures.add(`${userId}:${version}`)
      const entry = avatarPhotoCache.get(String(userId))
      if (entry?.objectUrl === photo) entry.invalid = true
      setPhoto('')
      setFailed(true)
    }
  }

  return <span
    className={`avatar ${className} ${hasPhoto && !photo && !failed ? 'avatar-loading' : ''}`}
    role="img"
    aria-label={`Avatar de ${name}`}
    aria-busy={hasPhoto && !photo && !failed}
    style={{ width: tamanho, height: tamanho, fontSize: Math.max(10, tamanho * 0.34) }}
  >
    {photo ? <img src={photo} alt="" onError={failPhoto} /> : hasPhoto && !failed
      ? <span className="avatar-skeleton" aria-hidden="true" />
      : getRoomInitials({ nome: name })}
  </span>
}
function ProfileDialog({ open, close, user, onUserUpdate }) {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ nomeCompleto: '', telefone: '', organizacao: '', cargoVinculo: '' })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passwordForm, setPasswordForm] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState('')
  const [visiblePasswords, setVisiblePasswords] = useState({})
  const photoInput = useRef(null)
  const perfilLabel = Number(user?.perfil) === 1 ? 'Coordenador / Admin' : Number(user?.perfil) === 2 ? 'Gestor de espaços' : Number(user?.perfil) === 3 ? 'Atendente / Staff' : 'Solicitante'
  const isStaff = Number(user?.perfil) < 4
  const profileChanged = Boolean(profile) && (
    form.nomeCompleto !== (profile.nomeCompleto || '')
    || form.telefone !== (profile.telefone || '')
    || form.organizacao !== (profile.organizacao || '')
    || form.cargoVinculo !== (profile.cargoVinculo || '')
  )
  const invalidPhone = Boolean(form.telefone) && !isValidBrazilianMobile(form.telefone)
  const passwordMismatch = Boolean(passwordForm.confirmarSenha)
    && passwordForm.novaSenha !== passwordForm.confirmarSenha
  const invalidNewPassword = passwordForm.novaSenha.length < 8
    || passwordForm.novaSenha.length > 64
    || passwordForm.novaSenha === passwordForm.senhaAtual

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError('')
    setSuccess('')
    request('/usuarios/me').then(data => {
      if (!active) return
      const normalizedProfile = { ...data, telefone: data.telefone ? formatBrazilianPhone(data.telefone) : '' }
      setProfile(normalizedProfile)
      setForm({
        nomeCompleto: normalizedProfile.nomeCompleto || '',
        telefone: normalizedProfile.telefone,
        organizacao: normalizedProfile.organizacao || '',
        cargoVinculo: normalizedProfile.cargoVinculo || '',
      })
      onUserUpdate?.({
        ...user,
        idUsuario: normalizedProfile.idUsuario,
        nome: normalizedProfile.nomeCompleto,
        temFoto: normalizedProfile.temFoto,
        fotoVersao: normalizedProfile.fotoVersao,
      })
    }).catch(loadError => { if (active) setError(loadError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open])

  function closeProfile() {
    if (saving) return
    if (profileChanged && !window.confirm('Há alterações de perfil não salvas. Deseja fechar mesmo assim?')) return
    close()
  }

  async function saveProfile(event) {
    event.preventDefault()
    if (invalidPhone || !profileChanged) return
    setSaving(true); setError(''); setSuccess('')
    try {
      const updated = await request('/usuarios/me', { method: 'PUT', body: JSON.stringify(form) })
      const normalized = { ...updated, telefone: updated.telefone ? formatBrazilianPhone(updated.telefone) : '' }
      setProfile(normalized)
      onUserUpdate?.({ ...user, nome: updated.nomeCompleto, email: updated.email })
      setSuccess('Perfil atualizado.')
    } catch (saveError) { setError(saveError.message) } finally { setSaving(false) }
  }

  async function uploadPhoto(file) {
    setError(''); setSuccess('')
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('A foto excede o limite de 2 MB.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Formato inválido. Escolha uma foto JPG, PNG ou WebP.')
      return
    }
    try {
      const image = await createImageBitmap(file)
      const side = Math.min(image.width, image.height)
      const canvas = document.createElement('canvas')
      canvas.width = 256; canvas.height = 256
      canvas.getContext('2d').drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256)
      image.close()
      const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Não foi possível preparar a imagem.')), 'image/jpeg', 0.9))
      const data = new FormData()
      data.append('foto', blob, 'perfil.jpg')
      const photo = await request('/usuarios/me/foto', { method: 'POST', body: data })
      setProfile(current => ({ ...current, ...photo }))
      onUserUpdate?.({ ...user, ...photo })
      setSuccess('Foto atualizada.')
    } catch (photoError) { setError(photoError.message) }
  }

  async function removePhoto() {
    setError(''); setSuccess('')
    try {
      const photo = await request('/usuarios/me/foto', { method: 'DELETE' })
      setProfile(current => ({ ...current, ...photo }))
      onUserUpdate?.({ ...user, ...photo })
      setSuccess('Foto removida.')
    } catch (photoError) { setError(photoError.message) }
  }

  async function changePassword(event) {
    event.preventDefault()
    if (invalidNewPassword || passwordMismatch) return
    setPasswordNotice('')
    setPasswordBusy(true)
    try {
      await request('/usuarios/me/senha', { method: 'PUT', body: JSON.stringify(passwordForm) })
      setPasswordForm({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
      setPasswordNotice('Senha alterada com sucesso.')
    } catch (passwordError) { setPasswordNotice(passwordError.message) } finally { setPasswordBusy(false) }
  }

  function passwordField(field, label, autocomplete) {
    const visible = Boolean(visiblePasswords[field])
    return <label className="profile-password-label" key={field}>
      {label}
      <span className="profile-password-input">
        <input
          required
          minLength={field === 'senhaAtual' ? undefined : 8}
          maxLength={field === 'senhaAtual' ? undefined : 64}
          type={visible ? 'text' : 'password'}
          autoComplete={autocomplete}
          value={passwordForm[field]}
          onChange={event => setPasswordForm({ ...passwordForm, [field]: event.target.value })}
          aria-invalid={field === 'confirmarSenha' && passwordMismatch}
          aria-describedby={field === 'confirmarSenha' && passwordMismatch ? 'profile-password-mismatch' : undefined}
        />
        <button
          type="button"
          className="password-visibility"
          aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisiblePasswords(current => ({ ...current, [field]: !current[field] }))}
        >{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </span>
    </label>
  }

  return <Modal open={open} close={closeProfile} title="Meu perfil" wide>
    {loading ? <p className="portal-empty">Carregando seus dados...</p> : profile && <div className="profile-editor">
      <section className="profile-editor-heading">
        <Avatar user={{ ...user, ...profile, nomeCompleto: profile.nomeCompleto }} nome={profile.nomeCompleto} tamanho={74} className="profile-editor-avatar" />
        <div><strong>{profile.nomeCompleto}</strong><small>{perfilLabel}</small><div className="profile-photo-actions">
          <button type="button" className="profile-photo-button" onClick={() => photoInput.current?.click()}>Alterar foto</button>
          {profile.temFoto && <button type="button" className="profile-photo-button profile-photo-remove" onClick={removePhoto}>Remover foto</button>}
          <small>JPG, PNG ou WebP até 2 MB</small>
          <input ref={photoInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { uploadPhoto(event.target.files?.[0]); event.target.value = '' }} />
        </div></div>
      </section>
      <form className="profile-editor-form" onSubmit={saveProfile}>
        <label htmlFor="profile-name">Nome<input id="profile-name" required maxLength="100" value={form.nomeCompleto} onChange={event => setForm({ ...form, nomeCompleto: event.target.value })} /></label>
        <label htmlFor="profile-phone">Telefone<PhoneInput id="profile-phone" value={form.telefone} onChange={telefone => setForm({ ...form, telefone })} aria-invalid={invalidPhone} aria-describedby={invalidPhone ? 'profile-phone-error' : undefined} />{invalidPhone && <small id="profile-phone-error" className="profile-field-error">Informe um celular no formato (48) 99999-9999.</small>}</label>
        <label htmlFor="profile-organization">Organização<input id="profile-organization" required maxLength="100" value={form.organizacao} readOnly={isStaff} onChange={event => setForm({ ...form, organizacao: event.target.value })} /></label>
        <label htmlFor="profile-role">Cargo ou vínculo<input id="profile-role" required maxLength="100" value={form.cargoVinculo} onChange={event => setForm({ ...form, cargoVinculo: event.target.value })} /></label>
        <div className="profile-readonly">
          <div><small>E-MAIL</small><strong><LockKeyhole size={14} aria-hidden="true" />{profile.email}</strong><small>Para alterar o e-mail, fale com a equipe do InPETU</small></div>
          <div><small>PERFIL DE ACESSO</small><strong>{perfilLabel}</strong></div>
        </div>
        {error && <p className="form-message" role="alert">{error}</p>}{success && <p className="success-note" role="status">{success}</p>}
        <Button className="profile-save-action" type="submit" disabled={saving || !profileChanged || invalidPhone}>{saving ? 'Salvando...' : 'Salvar perfil'}</Button>
      </form>
      <form className="profile-password-form" onSubmit={changePassword}>
        <Title as="h3">Alterar senha</Title>
        {passwordField('senhaAtual', 'Senha atual', 'current-password')}
        {passwordField('novaSenha', 'Nova senha', 'new-password')}
        {passwordField('confirmarSenha', 'Confirmar nova senha', 'new-password')}
        <small className="profile-password-rules">Use de 8 a 64 caracteres e uma senha diferente da atual.</small>
        {passwordMismatch && <p id="profile-password-mismatch" className="form-message" role="alert">A confirmação da nova senha não coincide.</p>}
        {passwordForm.novaSenha && passwordForm.novaSenha.length < 8 && <p className="form-message" role="alert">A nova senha deve ter pelo menos 8 caracteres.</p>}
        {passwordForm.novaSenha.length > 64 && <p className="form-message" role="alert">A nova senha deve ter no máximo 64 caracteres.</p>}
        {passwordForm.novaSenha && passwordForm.novaSenha === passwordForm.senhaAtual && <p className="form-message" role="alert">A nova senha deve ser diferente da senha atual.</p>}
        {passwordNotice && <p className={passwordNotice.includes('sucesso') ? 'success-note' : 'form-message'} role="status">{passwordNotice}</p>}
        <Button variant="outline" type="submit" disabled={passwordBusy || invalidNewPassword || passwordMismatch || !passwordForm.senhaAtual || !passwordForm.confirmarSenha}>{passwordBusy ? 'Alterando...' : 'Alterar senha'}</Button>
      </form>
    </div>}
  </Modal>
}
function Header({ view, setView, openLogin, onOpenCalendar, user, onLogout, onUserUpdate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileDetailsOpen, setProfileDetailsOpen] = useState(false)
  const goTo = (id) => { setView('home'); setMenuOpen(false); window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0) }
  const perfilLabel = user?.perfil === 1 ? 'Coordenador / Admin' : user?.perfil === 2 ? 'Gestor de espaços' : user?.perfil === 3 ? 'Atendente / Staff' : 'Solicitante'
  return <header className="site-header reference-header"><div className="header-inner"><button className="logo-button" aria-label="InPETU hub — página inicial" onClick={() => { setView(user && !isCrmUser(user) ? 'portal' : 'home'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Logo /></button>
    <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`}><button className={view === 'home' || view === 'portal' ? 'nav-active' : ''} onClick={() => { setView(user && !isCrmUser(user) ? 'portal' : 'home'); window.scrollTo({ top: 0, behavior: 'smooth' }); setMenuOpen(false) }}>{user && !isCrmUser(user) ? 'Meu portal' : 'Início'}</button><button onClick={() => goTo('spaces')}>Nossos Espaços</button><button onClick={() => goTo('about')}>Sobre o Hub</button><button className={view === 'help' ? 'nav-active' : ''} onClick={() => { setView('help'); setMenuOpen(false) }}>Fale Conosco</button></nav>
    <div className="header-actions">{user ? <div className="profile-control"><NotificationCenter user={user} /><div className="profile-switcher"><button type="button" className="profile-trigger" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(value => !value)}><Avatar user={user} tamanho={34} className="profile-avatar" /><span className="profile-meta"><strong>{user.nome || user.email || 'Perfil'}</strong><small>{perfilLabel}</small></span><ChevronDown className="profile-chevron" size={16} aria-hidden="true" /></button>{profileOpen && <div className="profile-menu" role="menu"><button type="button" role="menuitem" onClick={() => { setProfileDetailsOpen(true); setProfileOpen(false) }}>Meu perfil</button><button type="button" role="menuitem" onClick={() => { setView('reservations'); setProfileOpen(false) }}>Minhas reservas</button>{isCrmUser(user) && <a href="/paineladm" role="menuitem">Painel administrativo</a>}<button type="button" role="menuitem" onClick={() => { onLogout?.(); setProfileOpen(false) }}>Sair da conta</button></div>}</div><ProfileDialog open={profileDetailsOpen} close={() => setProfileDetailsOpen(false)} user={user} onUserUpdate={onUserUpdate} /></div> : <button className="team-link reference-login" onClick={() => { openLogin(); setMenuOpen(false) }}>Entrar</button>}<Button icon={CalendarDays} className="reference-header-cta" onClick={() => { onOpenCalendar(); setMenuOpen(false) }}>Agendar Espaço</Button></div><button className="mobile-menu icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu"><MenuIcon /></button>
  </div></header>
}
function RoomGallery({ space, onClose, onConsultSpace }) {
  const [imageIndex, setImageIndex] = useState(0)
  if (!space) return null
  const images = getRoomImages(space)
  const selectedImage = images[imageIndex] || images[0]
  const coverImage = getRoomImage(space)
  return <Modal open={Boolean(space)} close={onClose} title={`Foto de ${space.nomeEspaco}`} wide>
    <div className="room-gallery">
      <div className="room-gallery-stage" aria-live="polite">
        <img key={selectedImage} src={selectedImage} alt={`${space.nomeEspaco} , foto ${imageIndex + 1} de ${images.length}`} onError={event => {
          const image = event.currentTarget
          if (image.src !== new URL(coverImage, window.location.href).href) image.src = coverImage
        }} />
        {images.length > 1 && <>
          <button type="button" className="room-gallery-arrow room-gallery-previous" aria-label="Foto anterior" onClick={() => setImageIndex(index => (index - 1 + images.length) % images.length)}><ChevronLeft size={22} /></button>
          <button type="button" className="room-gallery-arrow room-gallery-next" aria-label="Próxima foto" onClick={() => setImageIndex(index => (index + 1) % images.length)}><ChevronRight size={22} /></button>
          <span className="room-gallery-counter">{imageIndex + 1} / {images.length}</span>
        </>}
      </div>
      {images.length > 1 && <div className="room-gallery-thumbnails" aria-label="Selecionar foto">
        {images.map((image, index) => <button key={image} type="button" className={index === imageIndex ? 'room-gallery-thumbnail room-gallery-thumbnail-active' : 'room-gallery-thumbnail'} aria-label={`Mostrar foto ${index + 1}`} aria-pressed={index === imageIndex} onClick={() => setImageIndex(index)}>
          <img src={image} alt="" />
        </button>)}
      </div>}
      <div className="room-gallery-caption">
        <div><small>{space.tipoEspaco}</small><Title as="h3">{space.nomeEspaco}</Title><p>{space.capacidadePessoas ? `Capacidade para até ${space.capacidadePessoas} pessoas` : 'Capacidade não informada'}</p></div>
        <Button icon={CalendarDays} onClick={() => { onClose(); onConsultSpace(space) }}>Ver horários</Button>
      </div>
    </div>
  </Modal>
}
function Home({ spaces, spacesLoaded, onConsultSpace, onSearchAvailability, onOpenCalendar }) {
  const [filter, setFilter] = useState('Todos os espaços')
  const filtered = filter === 'Todos os espaços' ? spaces : spaces.filter(space => space.tipoEspaco === filter)
  const types = ['Todos os espaços', ...new Set(spaces.map(space => space.tipoEspaco))]
  const showcaseSpaces = spaces.filter(space => space.ativo !== false)
  const [heroIndex, setHeroIndex] = useState(0)
  const [gallerySpace, setGallerySpace] = useState(null)
  const todayValue = localDateValue()
  const [searchType, setSearchType] = useState('')
  const [searchDate, setSearchDate] = useState(todayValue)
  useEffect(() => {
    if (heroIndex >= showcaseSpaces.length) setHeroIndex(0)
  }, [heroIndex, showcaseSpaces.length])
  const heroSpace = showcaseSpaces[heroIndex]
  return <>
    <Reveal as="section" className="hero-shell reference-hero">
      <div className="reference-hero-copy">
        <div className="reference-location"><MapPin size={14} /> Lote 73 · Sapiens Parque · Florianópolis</div>
        <Title as="h1" className="reference-heading">Um espaço para suas ideias <em>ganharem vida.</em></Title>
        <p className="reference-description">Encontre o ambiente certo para se reunir, aprender e fazer acontecer no InPETU Hub.</p>
        <form id="availability-search" className="availability-search" onSubmit={event => { event.preventDefault(); onSearchAvailability(searchDate, searchType) }}>
          <label><span>Tipo de espaço</span><select value={searchType} onChange={event => setSearchType(event.target.value)}><option value="">Todos os espaços</option>{[...new Set(spaces.map(space => space.tipoEspaco))].map(type => <option value={type} key={type}>{type}</option>)}</select></label>
          <label><span>Data desejada</span><input type="date" min={todayValue} value={searchDate} onChange={event => setSearchDate(event.target.value)} /></label>
          <Button type="submit" icon={Search}>Consultar horários</Button>
        </form>
        <dl className="reference-stats">
          <div><dt>08h-22h</dt><dd>Horário de funcionamento</dd></div>
          <div><dt>{spaces.filter(space => space.ativo !== false).length}</dt><dd>Ambientes ativos</dd></div>
          <div><dt>UFSC</dt><dd>Inovação em Florianópolis</dd></div>
        </dl>
      </div>
      <div className="reference-hero-images">
        {heroSpace && <RoomPhoto key={heroSpace.idEspaco} className="reference-hero-photo" space={heroSpace} alt={`Foto de ${heroSpace.nomeEspaco}`} />}
        <div className="hero-image-note"><span><Building2 size={18} /></span><div><strong>{heroSpace?.nomeEspaco || 'Seu próximo encontro começa aqui'}</strong><small>{heroSpace?.capacidadePessoas ? `Até ${heroSpace.capacidadePessoas} pessoas · InPETU Hub` : 'Consulte nossos ambientes no InPETU Hub'}</small></div></div>
        {showcaseSpaces.length > 1 && <div className="hero-image-controls">
          <span>{String(heroIndex + 1).padStart(2, '0')} <i /> {String(showcaseSpaces.length).padStart(2, '0')}</span>
          <button type="button" onClick={() => setHeroIndex(index => (index - 1 + showcaseSpaces.length) % showcaseSpaces.length)} aria-label="Espaço anterior"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => setHeroIndex(index => (index + 1) % showcaseSpaces.length)} aria-label="Próximo espaço"><ChevronRight size={18} /></button>
        </div>}
      </div>
    </Reveal>
    <Reveal as="section" id="spaces" className="spaces-section"><div className="section-top"><div><Title as="h2">Nossos <em>Espaços</em></Title><p>Ambientes preparados para capacitações, eventos, mentorias e visitas técnicas.</p></div><button className="all-spaces-link" onClick={onOpenCalendar}>Abrir calendário completo <ArrowRight size={16} /></button></div>
      <div className="filter-row"><div className="filter-label"><SlidersHorizontal size={15} /> EXPLORE POR TIPO</div>{types.map(type => <button key={type} className={`filter-chip ${filter === type ? 'filter-chip-active' : ''}`} onClick={() => setFilter(type)}>{type}</button>)}</div>
      {!spacesLoaded && <p className="empty-inline" role="status">Carregando espaços...</p>}
      {spacesLoaded && spaces.length === 0 && <p className="empty-inline" role="status">Nenhum espaço cadastrado no momento.</p>}
      <div className="space-grid">
        {filtered.map((space, index) => {
          const unavailable = space.ativo === false
          const guidedTourSpace = isGuidedTour(space.tipoEspaco)
          return <Reveal
            as="article"
            delay={Math.min(index, 5) * 0.07}
            className={`space-card ${index === 0 ? 'space-card-featured' : ''} ${unavailable ? 'space-card-unavailable' : ''}`}
            key={space.idEspaco}
          >
            <div className="space-image">
              <RoomPhoto space={space} alt={`Foto de ${space.nomeEspaco}`} />
              <button type="button" className="space-image-open" onClick={() => setGallerySpace(space)} aria-label={`Ver foto de ${space.nomeEspaco}`}>
                Ver foto <ArrowUpRight size={15} />
              </button>
              {unavailable
                ? <span className="space-unavailable-overlay">INDISPONÍVEL</span>
                : <span className="availability-dot"><i /> Disponível</span>}
            </div>
            <div className="space-info">
              <div className="space-meta">
                <span>{space.tipoEspaco}</span>
                <span><Users size={14} /> Até {space.capacidadePessoas || 20} pessoas</span>
              </div>
              <Title as="h3">{space.nomeEspaco}</Title>
              <p>
                {unavailable
                  ? <>{space.motivoIndisponibilidade || 'Este espaço está temporariamente indisponível.'}<small className="unavailable-deadline">{unavailableDeadlineLabel(space.dataPrevisaoRetorno)}</small></>
                  : space.equipamentosDisponiveis || 'Um ambiente versátil para as suas ideias.'}
              </p>
              <button className="space-cta" onClick={() => onConsultSpace(space)}>
                {unavailable ? 'Ver motivo' : guidedTourSpace ? 'Solicitar visita' : 'Ver Horários'}
              </button>
            </div>
          </Reveal>
        })}
      </div>
    </Reveal>
    {gallerySpace && <RoomGallery space={gallerySpace} onClose={() => setGallerySpace(null)} onConsultSpace={onConsultSpace} />}
    <Reveal as="section" id="about" className="about-hub"><div className="about-copy"><Title as="h2">Sobre o <em>Hub</em></Title><p>O <strong>Centro de Inovação InPETU Hub</strong> está instalado no <strong>Lote 73 do Parque Tecnológico Sapiens Parque</strong>, em Canasvieiras, Florianópolis, conectando pesquisa, empreendedorismo e desenvolvimento tecnológico.</p><p>O Hub oferece infraestrutura compartilhada para capacitações, eventos, mentorias e visitas técnicas, com espaços que podem ser consultados e solicitados diretamente pelo InPETU Connect.</p><ul><li><Check size={15} /> Infraestrutura multimídia para encontros e capacitações</li><li><Check size={15} /> Agendamento digital e acompanhamento pela equipe</li><li><Check size={15} /> Atendimento dedicado e cuidado com seus dados</li></ul></div><aside className="ecosystem-cta"><strong>Conheça os espaços</strong><p>Consulte o calendário e encontre um ambiente para sua próxima atividade.</p><Button icon={ArrowRight} onClick={onOpenCalendar}>Ver disponibilidade</Button></aside></Reveal>
  </>
}
function BookingModal({ space, close, onSaved, openLogin, initialDate, initialTime, initialEndTime, user }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ dataReserva: '', horarioInicio: '09:00', horarioFim: '10:00', tituloEvento: '', descricaoFinalidade: '', quantidadeParticipantes: '', telefoneContato: '' })
  const guidedTour = isGuidedTour(space?.tipoEspaco)
  useEffect(() => {
    if (!space) return
    const horarioInicio = guidedTour ? initialTime || '' : initialTime || '09:00'
    setForm({ dataReserva: initialDate || localDateValue(), horarioInicio, horarioFim: guidedTour ? initialEndTime || '' : initialEndTime || addMinutesToTime(horarioInicio, 30), tituloEvento: '', descricaoFinalidade: '', quantidadeParticipantes: '', telefoneContato: phoneDigits(user?.telefone) })
    setMessage('')
  }, [space, initialDate, initialTime, initialEndTime, guidedTour, user?.telefone])
  async function submit(event) {
    event.preventDefault()
    if (form.telefoneContato && !isValidBrazilianMobile(formatBrazilianPhone(form.telefoneContato))) {
      setMessage('Informe um celular válido para contato sobre a reserva.')
      return
    }
    setBusy(true); setMessage('')
    try {
      const saved = await request('/reservas', { method: 'POST', body: JSON.stringify({ ...form, quantidadeParticipantes: guidedTour ? Number(form.quantidadeParticipantes) : null, idEspaco: space.idEspaco }) })
      onSaved(saved); close()
    } catch (error) {
      if (error.status === 401) { close(); openLogin(); return }
      setMessage(error.message)
    } finally { setBusy(false) }
  }
  return <Modal open={Boolean(space)} close={close} title="Solicitar este espaço">
    <form className="form-stack" onSubmit={submit}><div className="selected-space"><RoomPhoto space={space} alt="" /><div><strong>{space?.nomeEspaco}</strong><small>{space?.tipoEspaco} · até {space?.capacidadePessoas} pessoas</small></div><span className="selected-status"><i /> {guidedTour ? 'Confirmação manual' : 'Aberto'}</span></div>
      {guidedTour && <p className="access-intro">A equipe confirma a visita, mas o intervalo fica reservado desde o primeiro pedido. Horários já solicitados não podem ser escolhidos novamente.</p>}
      <section className="reservation-contact-card" aria-label="Contato para esta reserva">
        <strong>Contato para esta reserva</strong>
        <label>Telefone para contato ou alteração<PhoneInput value={form.telefoneContato} onChange={telefoneContato => setForm(current => ({ ...current, telefoneContato }))} /><small>Usaremos este número caso seja necessário falar sobre a solicitação.</small></label>
      </section>
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
      const normalized = { ...result, perfil: Number(result.perfil ?? result.idPerfil ?? 4) }
      storeUser(normalized); onLogin(normalized)
    } catch (error) { setNotice(error.message) } finally { setBusy(false) }
  }
  return <main className="account-page">
    <div className="account-brand"><Logo variant="institutionalLight" /></div><div className="account-page-heading"><Title as="h1">Acesso ao InPETU Connect</Title><p>Entre com seu e-mail e senha para acessar sua conta.</p></div>
    <section className="account-card" aria-label="Acessar sua conta">
      <p className="account-description">Acesse para acompanhar e gerenciar suas solicitações. O painel da equipe é exibido conforme as permissões da sua conta.</p>
      <form className="form-stack account-form" onSubmit={submit}>
        <label>E-mail <span aria-hidden="true">*</span><input required type="email" autoComplete="email" placeholder="seu.email@empresa.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Senha <span aria-hidden="true">*</span><PasswordInput required autoComplete="current-password" placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)} /></label>
        {notice && <p className="account-notice account-notice-error" role="alert">{notice}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Aguarde...' : 'Entrar com e-mail e senha'}</Button>
      </form>
      <p className="account-signup">Ainda não tem cadastro? <button type="button" onClick={onSignup}>Cadastre-se aqui</button></p>
      <p className="account-security"><ShieldCheck size={14} /> Acesso à equipe restrito a colaboradores autorizados.</p>
    </section>
  </main>
}
function PasswordChangePage({ user, onLogout, onPasswordChanged }) {
  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await request('/usuarios/me/senha', { method: 'PUT', body: JSON.stringify(form) })
      setForm({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
      onPasswordChanged()
    } catch (changeError) { setError(changeError.message) } finally { setBusy(false) }
  }
  return <main className="account-page password-change-page">
    <div className="account-page-heading"><Title as="h1">Defina sua nova senha</Title><p>A senha temporária só pode ser usada para esta troca.</p></div>
    <section className="account-card">
      <p className="account-description">Olá, {user?.nome?.split(' ')[0] || 'usuário'}. Escolha uma senha nova para continuar usando o InPETU Connect.</p>
      <form className="form-stack account-form" onSubmit={submit}>
        <label>Senha temporária<input required type="password" autoComplete="current-password" value={form.senhaAtual} onChange={event => setForm({ ...form, senhaAtual: event.target.value })} /></label>
        <label>Nova senha<input required minLength="8" maxLength="64" type="password" autoComplete="new-password" value={form.novaSenha} onChange={event => setForm({ ...form, novaSenha: event.target.value })} /></label>
        <label>Confirmar nova senha<input required minLength="8" maxLength="64" type="password" autoComplete="new-password" value={form.confirmarSenha} onChange={event => setForm({ ...form, confirmarSenha: event.target.value })} /></label>
        {error && <p className="account-notice account-notice-error" role="alert">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar nova senha'}</Button>
      </form>
      <p className="account-signup"><button type="button" onClick={onLogout}>Sair da conta</button></p>
    </section>
  </main>
}
function SignupPage({ onBack, onCodeSent }) {
  const [form, setForm] = useState({ nomeCompleto: '', email: '', telefone: '', organizacao: '', cargoVinculo: '', senha: '', confirmarSenha: '' })
  const [status, setStatus] = useState('')
  const [sendFailedEmail, setSendFailedEmail] = useState('')
  const [resending, setResending] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setStatus('')
    if (form.senha !== form.confirmarSenha) return setStatus('As senhas não coincidem.')
    try {
      const { confirmarSenha, ...cadastro } = form
      await request('/usuarios/cadastro-publico', { method: 'POST', body: JSON.stringify(cadastro) })
      onCodeSent(form.email.trim().toLowerCase())
    } catch (error) {
      setStatus(error.message)
      if (error.message.includes('não foi possível enviar o código')) setSendFailedEmail(form.email.trim().toLowerCase())
    }
  }
  async function resendAfterSendFailure() {
    if (!sendFailedEmail || resending) return
    setResending(true)
    setStatus('')
    try {
      await request('/auth/reenviar-codigo', {
        method: 'POST',
        body: JSON.stringify({ email: sendFailedEmail }),
      })
      onCodeSent(sendFailedEmail)
    } catch (error) {
      setStatus(error.message)
    } finally {
      setResending(false)
    }
  }
  return <main className="account-page account-page-signup">
    <div className="account-brand"><Logo variant="institutionalLight" /></div><div className="account-page-heading"><Title as="h1">Criar acesso público</Title><p>Cadastre-se para solicitar espaços e acompanhar seus agendamentos.</p></div>
    <section className="account-card account-card-signup">
      <p className="account-description">Preencha seus dados. A classificação da organização é feita pela equipe InPETU.</p>
      <form className="form-stack account-form" onSubmit={submit}>
        <label>Nome completo <span aria-hidden="true">*</span><input required autoComplete="name" value={form.nomeCompleto} onChange={e => setForm({ ...form, nomeCompleto: e.target.value })} /></label>
        <label>E-mail <span aria-hidden="true">*</span><input required type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
        <label>Telefone<PhoneInput value={form.telefone} onChange={telefone => setForm({ ...form, telefone })} /></label>
        <label>Organização <span aria-hidden="true">*</span><input required value={form.organizacao} onChange={e => setForm({ ...form, organizacao: e.target.value })} /></label>
        <label>Cargo ou vínculo <span aria-hidden="true">*</span><input required value={form.cargoVinculo} onChange={e => setForm({ ...form, cargoVinculo: e.target.value })} /></label>
        <label>Senha <span aria-hidden="true">*</span><PasswordInput required minLength={8} maxLength={64} autoComplete="new-password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} /></label>
        <label>Confirmar senha <span aria-hidden="true">*</span><PasswordInput required minLength={8} maxLength={64} autoComplete="new-password" value={form.confirmarSenha} onChange={e => setForm({ ...form, confirmarSenha: e.target.value })} /></label>
        {status && <p className="account-notice account-notice-error" role="alert">{status}</p>}
        {sendFailedEmail && <button className="button button-primary" type="button" disabled={resending} onClick={resendAfterSendFailure}>{resending ? 'Reenviando...' : 'Reenviar código'}</button>}
        <Button type="submit">Criar conta <ArrowRight size={16} /></Button>
      </form>
      <p className="account-signup"><button type="button" onClick={onBack}>Voltar para o acesso</button></p>
    </section>
  </main>
}
function maskEmail(email) {
  const [local, domain] = email.split('@')
  return `${local.slice(0, 1)}***@${domain}`
}
function EmailVerificationPage({ email, onCorrectEmail, onConfirmed }) {
  const [digits, setDigits] = useState(Array(6).fill(''))
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeKind, setNoticeKind] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const sentAt = Number(sessionStorage.getItem('inpetu-code-sent-at'))
    const expiresAt = sentAt ? sentAt + 10 * 60_000 : Date.now() + 10 * 60_000
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
  })
  const [resendSeconds, setResendSeconds] = useState(60)
  const inputs = useRef([])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft(value => Math.max(0, value - 1))
      setResendSeconds(value => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  function changeDigit(index, rawValue) {
    const numbers = rawValue.replace(/\D/g, '')
    if (numbers.length > 1) {
      const pasted = numbers.slice(0, 6).split('')
      setDigits(current => current.map((digit, position) => pasted[position] || (position < index ? current[position] : '')))
      inputs.current[Math.min(index + pasted.length, 5)]?.focus()
      return
    }
    setDigits(current => current.map((digit, position) => position === index ? numbers : digit))
    if (numbers && index < 5) inputs.current[index + 1]?.focus()
  }

  async function submit(event) {
    event.preventDefault()
    if (!email || busy || secondsLeft === 0) return
    const code = digits.join('')
    if (!/^\d{6}$/.test(code)) {
      setNotice('Digite os seis números do código enviado por e-mail.')
      setNoticeKind('error')
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const result = await request('/auth/confirmar-codigo', {
        method: 'POST',
        body: JSON.stringify({ email, codigo: code }),
      })
      const user = { ...result, perfil: Number(result.perfil ?? result.idPerfil ?? 4) }
      storeUser(user)
      sessionStorage.removeItem('inpetu-code-email')
      sessionStorage.removeItem('inpetu-code-sent-at')
      onConfirmed(user)
    } catch (error) {
      setNotice(error.message)
      setNoticeKind('error')
      setDigits(Array(6).fill(''))
      inputs.current[0]?.focus()
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    if (!email || resendSeconds > 0 || resending) return
    setResending(true)
    setResendSeconds(60)
    setNotice('')
    try {
      await request('/auth/reenviar-codigo', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      sessionStorage.setItem('inpetu-code-sent-at', String(Date.now()))
      setSecondsLeft(10 * 60)
      setNotice('Se o cadastro estiver aguardando confirmação, enviaremos outro código.')
      setNoticeKind('success')
    } catch (error) {
      setNotice(error.message)
      setNoticeKind('error')
    } finally {
      setResending(false)
    }
  }

  const countdown = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`
  return <main className="account-page">
    <div className="account-brand"><Logo variant="institutionalLight" /></div><div className="account-page-heading"><Title as="h1">Verifique seu e-mail</Title><p>Digite o código de 6 dígitos enviado para {email ? <strong>{maskEmail(email)}</strong> : 'seu endereço de e-mail'}.</p></div>
    <section className="account-card verification-card">
      {email ? <form className="form-stack account-form" onSubmit={submit}>
        <div className="verification-code" role="group" aria-label="Código de verificação de seis dígitos">
          {digits.map((digit, index) => <input
            key={index}
            ref={element => { inputs.current[index] = element }}
            aria-label={`Dígito ${index + 1}`}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            inputMode="numeric"
            maxLength={6}
            value={digit}
            onChange={event => changeDigit(index, event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus()
              if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus()
              if (event.key === 'ArrowRight' && index < 5) inputs.current[index + 1]?.focus()
            }}
            onPaste={event => {
              const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
              if (pasted.length) {
                event.preventDefault()
                changeDigit(index, pasted)
              }
            }}
          />)}
        </div>
        <p className={`verification-expiry ${secondsLeft === 0 ? 'verification-expired' : ''}`} aria-live="polite">{secondsLeft > 0 ? `O código expira em ${countdown}.` : 'O código expirou. Solicite outro para continuar.'}</p>
        {notice && <p className={`account-notice ${noticeKind === 'success' ? 'account-notice-success' : 'account-notice-error'}`} role={noticeKind === 'error' ? 'alert' : 'status'}>{notice}</p>}
        <Button type="submit" disabled={busy || secondsLeft === 0 || digits.some(digit => !digit)}>{busy ? 'Confirmando...' : 'Confirmar e entrar'}</Button>
        <button className="verification-resend" type="button" disabled={resendSeconds > 0 || resending} onClick={resend}>{resending ? 'Enviando...' : resendSeconds > 0 ? `Reenviar código em ${resendSeconds}s` : 'Reenviar código'}</button>
      </form> : <p className="account-notice account-notice-error" role="alert">Não encontramos o e-mail deste cadastro neste navegador. Volte ao formulário e tente novamente.</p>}
      <p className="account-signup"><button type="button" onClick={onCorrectEmail}>Corrigir e-mail</button></p>
    </section>
  </main>
}
function EmailConfirmationPage() {
  const [status, setStatus] = useState({ kind: 'loading', message: 'Confirmando seu cadastro...' })
  const requestStarted = useRef(false)

  useEffect(() => {
    if (requestStarted.current) return
    requestStarted.current = true
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) {
      setStatus({ kind: 'error', message: 'O link de confirmação está incompleto.' })
      return
    }
    request('/usuarios/confirmar-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }).then(result => {
      setStatus({
        kind: 'success',
        message: result?.mensagem || 'Cadastro confirmado. Entre com seu e-mail e senha.',
      })
    }).catch(error => {
      setStatus({ kind: 'error', message: error.message })
    })
  }, [])

  return <main className="account-page">
    <div className="account-brand"><Logo variant="institutionalLight" /></div><div className="account-page-heading"><Title as="h1">Confirmação de cadastro</Title><p>Validação do seu acesso ao InPETU Connect.</p></div>
    <section className="account-card" aria-live="polite">
      <p className={`account-notice ${status.kind === 'success' ? 'account-notice-success' : status.kind === 'error' ? 'account-notice-error' : ''}`} role={status.kind === 'error' ? 'alert' : 'status'}>{status.message}</p>
      {status.kind !== 'loading' && <p className="account-signup"><a href="/">Voltar ao InPETU Connect</a></p>}
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
      const updated = await request(`/reservas/${selected.idReserva}/cancelar`, { method: 'DELETE', body: JSON.stringify({ motivoCancelamento: reason.trim() }) })
      if (updated.statusReserva !== 'Cancelada') throw new Error('A API não confirmou o cancelamento da reserva.')
      onCancel(updated, reason.trim())
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
    <div className="section-top"><div><Title as="h1">Minhas <em>reservas</em></Title><p>Acompanhe cada encontro planejado no InPETU Hub.</p></div><div className="compact-filter"><Filter size={15} /><select value={filter} onChange={e => setFilter(e.target.value)}><option>Todas</option><option value="Pendente">Pendente</option><option value="Confirmada">Aprovado</option><option value="Cancelada">Cancelada</option></select><ChevronDown size={14} /></div></div>
    <div className="reservation-table-wrap"><table className="data-table"><thead><tr><th>Encontro</th><th>Espaço</th><th>Data e horário</th><th>Status</th><th>Ação</th></tr></thead><tbody>{list.map(item => {
      const cancellationAllowed = calendarDaysUntil(item.dataReserva) >= 15
      return <tr key={item.idReserva}><td><strong>{item.tituloEvento}</strong><small>Solicitação #{item.idReserva}</small></td><td>{item.espaco || 'Espaço InPETU'}</td><td>{item.dataReserva} · {item.horarioInicio}-{item.horarioFim}{item.quantidadeParticipantes ? <small>{item.quantidadeParticipantes} visitantes</small> : null}{item.telefoneContato && <small>Contato: {formatBrazilianPhone(item.telefoneContato)}</small>}</td><td><span className={`status-pill ${reservationStatusClass(item.statusReserva)}`}><i />{reservationStatusLabel(item.statusReserva)}</span></td><td>{item.statusReserva !== 'Cancelada' && (cancellationAllowed ? <button className="table-action" onClick={() => { setSelected(item); setCancelError('') }}>Cancelar</button> : <small>Menos de 15 dias: solicite exceção à equipe.</small>)}</td></tr>
    })}</tbody></table>{list.length === 0 && <div className="empty-state"><CalendarDays size={25} /><p>Nenhuma reserva nesta categoria.</p></div>}</div>
    <Modal open={Boolean(selected)} close={() => { if (!cancelBusy) { setSelected(null); setCancelError('') } }} title="Cancelar solicitação">
      <div className="cancel-summary"><span>RESERVA #{selected?.idReserva}</span><strong>{selected?.tituloEvento}</strong><small>{selected?.dataReserva} · {selected?.horarioInicio}-{selected?.horarioFim}</small></div>
      <label className="reason-field">Motivo do cancelamento<textarea rows="4" required placeholder="Conte por que está cancelando esta reserva" value={reason} onChange={e => setReason(e.target.value)} /></label>
      <p className="form-footnote">O cancelamento exige pelo menos 15 dias de antecedência. Dentro desse prazo, somente a equipe pode autorizar uma exceção.</p>
      {cancelError && <p className="form-message" role="alert">{cancelError}</p>}
      <Button variant="danger" disabled={!reason.trim() || cancelBusy} onClick={cancel}>{cancelBusy ? 'Cancelando...' : 'Confirmar cancelamento'}</Button>
    </Modal>
  </main>
}
function PortalHome({ user, items, reservationsLoaded, onOpenCalendar, onOpenReservations }) {
  const activeThisMonth = items.filter(item => ['Pendente', 'Confirmada'].includes(item.statusReserva)
    && item.dataReserva?.slice(0, 7) === localDateValue().slice(0, 7)).length
  const upcoming = items
    .filter(item => ['Pendente', 'Confirmada'].includes(item.statusReserva)
      && new Date(`${item.dataReserva}T${item.horarioInicio || '00:00'}`) >= new Date())
    .sort((a, b) => `${a.dataReserva}T${a.horarioInicio}`.localeCompare(`${b.dataReserva}T${b.horarioInicio}`))
    .slice(0, 3)
  return <main className="inner-page portal-home">
    <section className="portal-welcome">
      <div><Title as="h1">Olá, <em>{user?.nome?.split(' ')[0] || 'bem-vindo'}</em></Title><p>Acompanhe suas reservas e planeje o próximo encontro no InPETU Hub.</p></div>
      <Avatar user={user} tamanho={64} className="portal-avatar" />
    </section>
    <section className="portal-summary-grid" aria-label="Resumo da conta">
      <article className="portal-summary-card"><span>RESERVAS ATIVAS · ESTE MÊS</span><strong>{activeThisMonth}</strong><small>Solicitações pendentes ou confirmadas neste mês</small></article>
      <article className="portal-summary-card"><span>PRÓXIMAS RESERVAS</span><strong>{reservationsLoaded ? upcoming.length : '...'}</strong><small>Solicitações pendentes ou confirmadas</small></article>
    </section>
    <section className="portal-upcoming">
      <div className="portal-section-heading"><div><Title as="h2">Próximas reservas</Title></div><button type="button" className="portal-text-action" onClick={onOpenReservations}>Minhas reservas <ArrowRight size={15} /></button></div>
      {!reservationsLoaded ? <p className="portal-empty">Carregando suas reservas...</p> : upcoming.length ? <div className="portal-upcoming-list">{upcoming.map(item => <article key={item.idReserva}><span className="portal-date"><strong>{new Date(`${item.dataReserva}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit' })}</strong><small>{new Date(`${item.dataReserva}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></span><div><strong>{item.tituloEvento}</strong><small>{item.dataReserva} · {item.horarioInicio}-{item.horarioFim} · {item.espaco || 'Espaço InPETU'}{item.telefoneContato ? ` · Contato: ${formatBrazilianPhone(item.telefoneContato)}` : ''}</small></div><span className={`status-pill ${reservationStatusClass(item.statusReserva)}`}><i />{reservationStatusLabel(item.statusReserva)}</span></article>)}</div> : <p className="portal-empty">Você ainda não tem reservas próximas. Que tal planejar seu próximo encontro?</p>}
      <Button icon={CalendarDays} onClick={onOpenCalendar}>Agendar espaço</Button>
    </section>
  </main>
}
function HelpPage() {
  const [form, setForm] = useState({ emailContato: '', telefoneContato: '', mensagemDuvida: '' })
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  async function submit(event) { event.preventDefault(); setStatus(''); if (file && (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type) || file.size > 10 * 1024 * 1024)) return setStatus('Anexe PDF, PNG ou JPG de até 10 MB.'); try { if (file) await uploadQuestion(form, file, setProgress); else await request('/duvidas', { method: 'POST', body: JSON.stringify(form) }); setProgress(100); setStatus('Mensagem enviada. A equipe InPETU responderá pelo e-mail informado.'); setForm({ emailContato: '', telefoneContato: '', mensagemDuvida: '' }); setFile(null) } catch (error) { setStatus(error.message); setProgress(0) } }
  return <main className="inner-page help-page"><div className="help-intro"><Title as="h1">Vamos conversar<br /><em>sobre sua ideia?</em></Title><p>Tem dúvidas sobre os espaços, eventos ou quer descobrir como fazer parte do ecossistema? Escreva para a gente.</p><div className="help-contact"><span><Mail size={17} /></span><div><small>FALE DIRETAMENTE</small><strong>inpetu@contato.ufsc.br</strong></div></div><div className="help-contact"><span><MapPin size={17} /></span><div><small>VENHA NOS VISITAR</small><strong>Lote 73 · Sapiens Parque, Florianópolis</strong></div></div></div><form className="help-form" onSubmit={submit}><div className="form-heading"><MessageCircle size={20} /><div><strong>Fale com a equipe</strong><small>Retornamos em até dois dias úteis.</small></div></div><label>Seu e-mail<input required type="email" value={form.emailContato} onChange={e => setForm({ ...form, emailContato: e.target.value })} /></label><label>Telefone <span>(opcional)</span><PhoneInput value={form.telefoneContato} onChange={telefoneContato => setForm({ ...form, telefoneContato })} /></label><label>Sua mensagem<textarea required rows="5" maxLength="5000" value={form.mensagemDuvida} onChange={e => setForm({ ...form, mensagemDuvida: e.target.value })} placeholder="Como podemos ajudar?" /></label><label className="upload-box"><input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={e => setFile(e.target.files?.[0] || null)} /><span className="upload-icon"><Plus size={19} /></span><span><strong>{file ? file.name : 'Adicionar anexo'}</strong><small>PDF, PNG ou JPG · até 10 MB</small></span><span className="upload-action">Escolher arquivo</span></label>{progress > 0 && <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>}{status && <p className={status.startsWith('Mensagem') ? 'success-note' : 'form-message'}>{status}</p>}<Button type="submit">Enviar mensagem <ArrowRight size={16} /></Button><p className="form-footnote"><ShieldCheck size={14} /> Seus dados são protegidos pela política de privacidade UFSC.</p></form></main>
}
function CalendarPage({ spaces, spacesLoaded, onReserve, initialDate, initialKind, initialSpaceId, availabilityVersion }) {
  const [date, setDate] = useState(initialDate)
  const [monthCursor, setMonthCursor] = useState(() => new Date(`${initialDate}T12:00:00`))
  const [monthCalendarOpen, setMonthCalendarOpen] = useState(false)
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
  const [selectedSpaceId, setSelectedSpaceId] = useState(initialSpaceId || '')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [nextSlotSelection, setNextSlotSelection] = useState('start')
  const [saoPauloNow, setSaoPauloNow] = useState(saoPauloDateTime)
  const selectedSpace = orderedSpaces.find(space => String(space.idEspaco) === selectedSpaceId && space.ativo !== false)
  const guidedTour = isGuidedTour(selectedSpace?.tipoEspaco)
  useEffect(() => {
    const interval = window.setInterval(() => setSaoPauloNow(saoPauloDateTime()), 30_000)
    return () => window.clearInterval(interval)
  }, [])
  useEffect(() => {
    if (selectedSpaceId || !spacesLoaded) return
    const suggestedSpace = spaces.find(space => space.tipoEspaco === initialKind && space.ativo !== false)
    if (suggestedSpace) setSelectedSpaceId(String(suggestedSpace.idEspaco))
  }, [initialKind, selectedSpaceId, spaces, spacesLoaded])
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
  const today = new Date(`${saoPauloNow.date}T12:00:00`)
  today.setHours(12, 0, 0, 0)
  const upcomingDays = Array.from({ length: 14 }, (_, index) => {
    const day = new Date(today)
    day.setDate(today.getDate() + index)
    return day
  })
  const slots = Array.from({ length: 28 }, (_, index) => {
    const totalMinutes = 8 * 60 + index * 30
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
  })
  const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1, 12)
  const monthDays = Array.from({ length: new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate() }, (_, index) => {
    const day = new Date(monthStart)
    day.setDate(index + 1)
    return day
  })
  const displayDate = selectedDay.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const slotGroups = [
    { label: 'Manhã', times: slots.filter(time => time < '12:00') },
    { label: 'Tarde', times: slots.filter(time => time >= '12:00' && time < '18:00') },
    { label: 'Noite', times: slots.filter(time => time >= '18:00') },
  ]
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
  const canRequestReservation = Boolean(selectedSpace) && date >= saoPauloNow.date && !availabilityLoading && !availabilityError &&
    isRangeAvailable(startTime, endTime)
  const reservationDurationMinutes = startTime && endTime
    ? (Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3, 5))) - (Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5)))
    : 0
  const reservationDurationLabel = reservationDurationMinutes
    ? `${Math.floor(reservationDurationMinutes / 60) ? `${Math.floor(reservationDurationMinutes / 60)}h` : ''}${reservationDurationMinutes % 60 ? `${Math.floor(reservationDurationMinutes / 60) ? ' ' : ''}${reservationDurationMinutes % 60}min` : ''}`
    : ''
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
    if (time >= startTime) {
      setEndTime(addMinutesToTime(time, 30))
      setNextSlotSelection('start')
      return
    }
    if (time < startTime) selectStartTime(time)
  }
  function selectDate(day) {
    const value = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    setDate(value)
    setMonthCursor(new Date(`${value}T12:00:00`))
  }
  function moveMonth(offset) {
    setMonthCursor(current => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12))
  }
  function goToToday() {
    const value = saoPauloNow.date
    setDate(value)
    const [year, month] = value.split('-').map(Number)
    setMonthCursor(new Date(year, month - 1, 1, 12))
  }
  function dateButton(day) {
    const value = localDateValue(day)
    const isSelected = value === date
    const isToday = value === saoPauloNow.date
    return <button key={value} type="button" disabled={value < saoPauloNow.date} className={`calendar-date-option ${isSelected ? 'calendar-date-selected' : ''} ${isToday ? 'calendar-date-today' : ''}`} onClick={() => selectDate(day)} aria-current={isToday ? 'date' : undefined} aria-pressed={isSelected}>
      {day.getDate()}
    </button>
  }
  return <main className="inner-page catalog-page booking-page">
    <header className="catalog-heading booking-heading">
      <Title as="h1">Agende um espaço</Title>
      <p>Escolha o ambiente, defina o dia e horário e envie sua solicitação.</p>
    </header>
    <ol className="booking-steps" aria-label="Etapas da reserva">
      <li className={selectedSpace ? 'booking-step-complete' : 'booking-step-current'}><span>1</span> Espaço</li>
      <li className={startTime && endTime ? 'booking-step-complete' : selectedSpace ? 'booking-step-current' : ''}><span>2</span> Dia e horário</li>
      <li className={canRequestReservation ? 'booking-step-current' : ''}><span>3</span> Confirmar</li>
    </ol>

    <div className="booking-layout">
      <div className="booking-main">
        <section className="booking-section" aria-labelledby="booking-space-title">
          <div className="booking-section-heading"><span className="booking-section-number">01</span><div><Title as="h2" id="booking-space-title">Escolha o espaço</Title><p>Selecione um ambiente para ver a agenda.</p></div></div>
          {!spacesLoaded ? <p className="booking-state" role="status">Carregando espaços...</p> : orderedSpaces.length === 0 ? <p className="booking-state">Nenhum espaço cadastrado no momento.</p> : <div className="booking-space-grid">
            {orderedSpaces.map(space => {
              const unavailable = space.ativo === false
              const selected = selectedSpace?.idEspaco === space.idEspaco
              const needsManualReview = space.exigeAprovacaoManual
              return <button key={space.idEspaco} type="button" className={`booking-space-card ${selected ? 'booking-space-selected' : ''} ${unavailable ? 'booking-space-unavailable' : ''}`} disabled={unavailable} onClick={() => setSelectedSpaceId(String(space.idEspaco))} aria-pressed={selected} aria-label={`${space.nomeEspaco}, até ${space.capacidadePessoas || 20} pessoas${unavailable ? `, indisponível: ${space.motivoIndisponibilidade || 'temporariamente indisponível'}` : ''}`}>
                <RoomPhoto space={space} alt="" className="booking-space-photo" />
                {unavailable && <span className="booking-unavailable-label">INDISPONÍVEL</span>}
                {selected && <span className="booking-selected-check"><Check size={15} /></span>}
                <span className="booking-space-copy"><strong>{space.nomeEspaco}</strong><span className="booking-space-capacity"><Users size={14} /> Até {space.capacidadePessoas || 20} pessoas</span>
                  {needsManualReview && <span className="booking-manual-badge">Requer análise manual</span>}
                  {unavailable && <span className="booking-unavailable-reason">{space.motivoIndisponibilidade || 'Este espaço está temporariamente indisponível.'}</span>}
                </span>
              </button>
            })}
          </div>}
        </section>

        <section className="booking-section" aria-labelledby="booking-date-title">
          <div className="booking-section-heading"><span className="booking-section-number">02</span><div><Title as="h2" id="booking-date-title">Escolha dia e horário</Title><p>Selecione uma data e um intervalo disponível.</p></div></div>
          <div className="booking-date-toolbar"><Title as="h3">Próximos 14 dias</Title><button type="button" className="booking-calendar-toggle" aria-expanded={monthCalendarOpen} aria-controls="booking-month-calendar" onClick={() => setMonthCalendarOpen(open => !open)}><CalendarDays size={15} /> {monthCalendarOpen ? 'Fechar calendário' : 'Abrir calendário'}</button></div>
          <div className="booking-date-rail" role="group" aria-label="Selecione um dos próximos 14 dias">
            {upcomingDays.map(day => {
              const value = localDateValue(day)
              const selected = date === value
              const isToday = value === localDateValue()
              return <button key={value} type="button" className={`booking-date-card ${selected ? 'booking-date-selected' : ''}`} onClick={() => selectDate(day)} aria-pressed={selected} aria-current={isToday ? 'date' : undefined}>
                <span>{isToday ? 'Hoje' : day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span><strong>{day.getDate()}</strong><small>{day.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small>
              </button>
            })}
          </div>
          {monthCalendarOpen && <div id="booking-month-calendar" className="booking-month-calendar">
            <div className="calendar-month-heading"><button type="button" aria-label="Mês anterior" disabled={monthCursor.getFullYear() === new Date().getFullYear() && monthCursor.getMonth() <= new Date().getMonth()} onClick={() => moveMonth(-1)}><ChevronLeft size={17} /></button><strong className="calendar-month-label">{monthCursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label="Próximo mês" onClick={() => moveMonth(1)}><ChevronRight size={17} /></button><button type="button" className="calendar-today-button" onClick={goToToday}>Hoje</button></div>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => <span key={`${day}-${index}`} className="calendar-weekday">{day}</span>)}
            {Array.from({ length: monthStart.getDay() }, (_, index) => <span key={`empty-${index}`} className="calendar-date-empty" />)}
            {monthDays.map(day => dateButton(day))}
          </div>}
          <div className="booking-legend" aria-label="Legenda de disponibilidade"><span><i className="booking-legend-free" /> Livre</span><span><i className="booking-legend-busy" /> Ocupado</span><span><i className="booking-legend-pending" /> Em análise</span></div>
          {guidedTour && <p className="booking-guided-note" role="note">Visitas guiadas exigem análise da equipe. O horário solicitado fica reservado enquanto aguarda a avaliação.</p>}
          {!selectedSpace ? <p className="booking-state">Escolha um espaço para consultar os horários.</p> : availabilityLoading ? <p className="booking-state" role="status">Consultando disponibilidade...</p> : availabilityError ? <div className="booking-error" role="alert"><span>Não foi possível consultar a disponibilidade: {availabilityError}</span><button type="button" onClick={() => setAvailabilityReload(value => value + 1)}>Tentar novamente</button></div> : <div className="booking-time-groups">
            <p className="catalog-time-help">Clique no primeiro e no último horário que você quer reservar.</p>
            {slotGroups.map(group => <section className="booking-time-group" key={group.label} aria-label={group.label}>
              <Title as="h3">{group.label}</Title><div className="booking-time-grid">{group.times.map(time => {
                const reservation = reservationAt(time)
                const status = reservation ? (reservation.statusReserva === 'Pendente' ? 'pending' : 'busy') : 'free'
                const statusLabel = reservation ? (reservation.statusReserva === 'Pendente' ? 'Em análise' : 'Ocupado') : 'Livre'
                const slotEndTime = addMinutesToTime(time, 30)
                const isSelectedStart = time === startTime
                const isSelectedRange = startTime && endTime && time >= startTime && time < endTime
                const isSelectedEnd = endTime && time === addMinutesToTime(endTime, -30)
                const isPastToday = date === saoPauloNow.date && time < saoPauloNow.time
                const rangeWouldConflict = nextSlotSelection === 'end' && startTime && time >= startTime &&
                  !isRangeAvailable(startTime, addMinutesToTime(time, 30))
                const disabled = isPastToday || Boolean(reservation) || Boolean(rangeWouldConflict)
                const unavailableReason = isPastToday ? 'horário já passado' : reservation ? statusLabel : rangeWouldConflict ? 'o intervalo inclui um horário ocupado ou em análise' : statusLabel
                return <button key={time} type="button" className={`booking-time-option booking-time-${status} ${isSelectedRange && !reservation ? 'booking-time-in-range' : ''} ${isSelectedStart ? 'booking-time-start' : ''} ${isSelectedEnd ? 'booking-time-end' : ''}`} disabled={disabled} onClick={() => selectSlotTime(time)} aria-label={`${time}-${slotEndTime}, ${disabled ? unavailableReason : statusLabel}${isSelectedStart ? ', início selecionado' : ''}${isSelectedEnd ? ', fim selecionado' : ''}`}>
                  <span className="booking-time-dot" aria-hidden="true" /><strong>{time}</strong>
                </button>
              })}</div>
            </section>)}
          </div>}
          {startTime && endTime > startTime && !availabilityLoading && !availabilityError && !isRangeAvailable(startTime, endTime) && <p className="booking-validation-error" role="alert">O período escolhido inclui um horário ocupado ou em análise.</p>}
          <p className="booking-hours-note">Funcionamento: 08h-22h. Horários ocupados ou em análise não podem ser reservados.</p>
        </section>
      </div>

      <aside className="booking-summary" aria-labelledby="booking-summary-title">
        <Title as="h2" id="booking-summary-title">Resumo da solicitação</Title>
        <dl><div><dt>Espaço</dt><dd>{selectedSpace?.nomeEspaco || 'Não selecionado'}</dd></div><div><dt>Data</dt><dd>{date ? displayDate : 'Não selecionada'}</dd></div><div><dt>Horário</dt><dd>{startTime && endTime ? `${startTime}-${endTime} · ${reservationDurationLabel}` : 'Não selecionado'}</dd></div></dl>
        {selectedSpace?.exigeAprovacaoManual && <p className="booking-summary-review">Este pedido requer análise manual.</p>}
        {availabilityLoading ? <p className="booking-summary-hint" role="status">Consultando horários disponíveis...</p> : availabilityError ? <p className="booking-summary-hint booking-summary-hint-error">Não foi possível validar os horários. Tente novamente.</p> : !canRequestReservation && <p className="booking-summary-hint">{!selectedSpace ? 'Escolha um espaço.' : date < localDateValue() ? 'Escolha uma data de hoje em diante.' : !startTime ? 'Escolha um horário de início.' : !endTime ? 'Escolha um horário de término.' : 'Escolha um intervalo disponível.'}</p>}
        <Button icon={CalendarDays} disabled={!canRequestReservation} onClick={() => onReserve(selectedSpace, date, startTime, endTime)}>{guidedTour ? 'Solicitar visita guiada' : 'Solicitar reserva'}</Button>
      </aside>
    </div>
  </main>
}
function Crm({ user, setUser, onReturnHome, spaces, setSpaces, reservations, setReservations }) {
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
function LoginInline({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  async function submit(event) { event.preventDefault(); setError(''); try { const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha: password }) }); const normalized = { ...result, perfil: Number(result.perfil ?? result.idPerfil ?? 4) }; storeUser(normalized); onLogin(normalized) } catch (e) { setError(e.message) } }
  return <form className="form-stack" onSubmit={submit}><label>E-mail corporativo<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@inpetuhub.ufsc.br" /></label><label>Senha<PasswordInput required value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" /></label>{error && <p className="form-message">{error}</p>}<Button type="submit">Acessar painel <ArrowRight size={16} /></Button><p className="form-footnote"><ShieldCheck size={14} /> Acesso protegido por autenticação segura.</p></form>
}
function Kpi({ icon: Icon, label, value, change, accent }) { return <article className="kpi-card"><div className={`kpi-icon kpi-${accent}`}><Icon size={18} /></div><span className="kpi-label">{label}</span><strong className="kpi-value">{value}</strong><small>{change}</small><ArrowUpRight className="kpi-trend" size={16} /></article> }
function CrmTitle({ title, description, action }) { return <div className="crm-title-row"><div><Title as="h1">{title}</Title><p>{description}</p></div>{action}</div> }
function PersonaCombobox({ value, onChange }) {
  const [query, setQuery] = useState('')
  const options = Object.entries(personas).filter(([id, persona]) =>
    `p${id} ${persona.label} ${personaQuotaLabel(persona)}`.toLocaleLowerCase('pt-BR')
      .includes(query.trim().toLocaleLowerCase('pt-BR')))
  return <Combobox value={value ? Number(value) : null} onChange={selected => { onChange(String(selected)); setQuery('') }}>
    <div className="persona-combobox">
      <ComboboxInput
        aria-label="Classificação por persona"
        className="persona-combobox-input"
        displayValue={id => id ? `P${id} · ${personas[Number(id)]?.label || ''}` : ''}
        onChange={event => setQuery(event.target.value)}
        placeholder="Selecione P1-P6"
      />
      <ChevronDown size={16} aria-hidden="true" />
      <ComboboxOptions className="persona-combobox-options">
        {options.map(([id, persona]) => <ComboboxOption key={id} value={Number(id)} className={({ focus, selected }) => `persona-combobox-option ${focus ? 'persona-option-focus' : ''} ${selected ? 'persona-option-selected' : ''}`}>
          <span className={`persona-code-badge ${persona.badge}`}>P{id}</span>
          <span className="persona-option-copy"><strong>{persona.label}</strong><small>{personaQuotaLabel(persona)}</small></span>
          <Check size={16} aria-hidden="true" />
        </ComboboxOption>)}
        {!options.length && <p className="persona-combobox-empty">Nenhuma persona encontrada.</p>}
      </ComboboxOptions>
    </div>
  </Combobox>
}
function ClientProfileDialog({ client, reservations, tickets, auditItems, close, onSave, onPersona, onDeactivate, canDeactivate, canResetPassword, onResetPassword }) {
  const [tab, setTab] = useState('Dados gerais')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    nomeCompleto: client?.nomeCompleto || '',
    email: client?.email || '',
    telefone: client?.telefone || '',
    organizacao: client?.organizacao || '',
    cargoVinculo: client?.cargoVinculo || '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [personaValue, setPersonaValue] = useState(client?.idPersona ? String(client.idPersona) : '')
  const [personaBusy, setPersonaBusy] = useState(false)
  const [personaFeedback, setPersonaFeedback] = useState('')
  const [deactivationOpen, setDeactivationOpen] = useState(false)
  const [deactivationReason, setDeactivationReason] = useState('')
  const [deactivationBusy, setDeactivationBusy] = useState(false)
  const [deactivationError, setDeactivationError] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [generatePassword, setGeneratePassword] = useState(true)
  const [manualPassword, setManualPassword] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetResult, setResetResult] = useState('')
  if (!client) return null
  const persona = personas[client.idPersona]
  const clientReservations = reservations.filter(item => item.idSolicitante === client.idUsuario)
    .sort((left, right) => right.dataReserva.localeCompare(left.dataReserva))
  const clientTickets = tickets.filter(item => item.emailContato?.toLowerCase() === client.email?.toLowerCase())
  const clientAudit = auditItems.filter(item => item.target.includes(`#${client.idUsuario}`))
  const hours = monthlyQuotaUsed(reservations, client.idUsuario)
  const personaChanged = Boolean(personaValue) && Number(personaValue) !== Number(client.idPersona || 0)
  const fields = [
    ['E-mail', form.email || 'Não informado'],
    ['Telefone / WhatsApp', form.telefone || 'Não informado'],
    ['Organização', form.organizacao || 'Não informada'],
    ['Vínculo / cargo', form.cargoVinculo || 'Não informado'],
    ['Data de cadastro', client.dataCadastro ? new Date(client.dataCadastro).toLocaleString('pt-BR') : ','],
    ['Status', client.ativo === false ? 'Inativo' : 'Ativo'],
  ]
  async function save(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await onSave(client, form)
      setEditing(false)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setBusy(false)
    }
  }
  async function savePersona() {
    if (!personaChanged || personaBusy) return
    const nextPersona = personas[Number(personaValue)]
    if (persona?.quota !== nextPersona?.quota
        && !window.confirm(`Esta alteração muda a cota mensal de ${personaQuotaLabel(persona)} para ${personaQuotaLabel(nextPersona)}. Deseja continuar?`)) return
    setPersonaBusy(true)
    setError('')
    setPersonaFeedback('')
    try {
      await onPersona(client, personaValue)
      setPersonaFeedback('Persona atualizada com sucesso.')
    } catch (personaError) {
      setPersonaFeedback(personaError.message)
    } finally {
      setPersonaBusy(false)
    }
  }
  async function deactivate(event) {
    event.preventDefault()
    if (!deactivationReason.trim() || deactivationBusy) return
    setDeactivationBusy(true)
    setDeactivationError('')
    try {
      await onDeactivate(client, deactivationReason)
    } catch (deactivateError) {
      setDeactivationError(deactivateError.message)
    } finally {
      setDeactivationBusy(false)
    }
  }
  async function resetPassword(event) {
    event.preventDefault()
    setResetError('')
    if (!window.confirm(`Redefinir a senha de ${client.nomeCompleto}? Todas as sessões atuais serão encerradas.`)) return
    setResetBusy(true)
    try {
      const result = await onResetPassword(client, {
        gerarAutomaticamente: generatePassword,
        senhaTemporaria: generatePassword ? null : manualPassword,
      })
      setResetResult(result.senhaTemporaria)
      setManualPassword('')
      setResetOpen(false)
    } catch (resetFailure) { setResetError(resetFailure.message) } finally { setResetBusy(false) }
  }
  return <Modal open={Boolean(client)} close={close} title={client.nomeCompleto} wide>
    <div className="client-profile-heading"><Avatar user={client} nome={client.nomeCompleto} tamanho={48} className="client-profile-avatar" /><div><p className="client-profile-intro">Cadastro de solicitante · ficha e histórico</p><span className={`client-profile-status ${client.ativo === false ? 'client-profile-inactive' : ''}`}><i />{client.ativo === false ? 'Cadastro inativo' : 'Cadastro ativo'}</span></div></div>
    <div className="client-profile-tabs" role="tablist" aria-label="Seções da ficha do cliente">
      {['Dados gerais', `Reservas (${clientReservations.length})`, `Dúvidas (${clientTickets.length})`, 'Auditoria'].map(label => {
        const name = label.split(' (')[0]
        return <button key={name} type="button" role="tab" aria-selected={tab === name} className={tab === name ? 'client-profile-tab-active' : ''} onClick={() => setTab(name)}>{label}</button>
      })}
    </div>
    <div className="client-profile-content">
      {tab === 'Dados gerais' && <>
        <section className="client-persona-callout">
          <div><strong><ShieldCheck size={16} /> Persona de uso</strong><span>{persona ? `P${client.idPersona} · ${persona.label}` : 'Persona ainda não definida'}</span><small>{!persona ? 'Defina a persona para calcular a cota mensal.' : persona.quota == null ? 'Sem cota mensal definida na tabela.' : `${hours.toFixed(1).replace('.', ',')} de ${persona.quota} horas utilizadas/reservadas neste mês.`}</small></div>
          <div className="client-persona-edit"><label>Classificação<PersonaCombobox value={personaValue} onChange={next => { setPersonaValue(next); setError(''); setPersonaFeedback('') }} /></label><button type="button" className={`client-profile-action ${personaChanged ? 'persona-save-active' : ''}`} disabled={!personaChanged || personaBusy} onClick={savePersona}>{personaBusy ? 'Salvando...' : 'Salvar persona'}</button>{personaFeedback && <p className={personaFeedback.includes('sucesso') ? 'success-note' : 'form-message'} role="status">{personaFeedback}</p>}</div>
          <small className="client-profile-private-note">Visível somente para a equipe autorizada.</small>
        </section>
        <form className="client-profile-edit-form" onSubmit={save}>
          {editing ? <div className="client-profile-grid client-profile-grid-edit">
            <label>Nome completo<input required maxLength={100} value={form.nomeCompleto} onChange={event => setForm({ ...form, nomeCompleto: event.target.value })} /></label>
            <label>E-mail<input required type="email" maxLength={100} value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
            <label>Telefone / WhatsApp<PhoneInput value={form.telefone} onChange={telefone => setForm({ ...form, telefone })} /></label>
            <label>Organização<input required maxLength={100} value={form.organizacao} onChange={event => setForm({ ...form, organizacao: event.target.value })} /><small>A alteração vale só para seu cadastro. Organizações novas ficam pendentes de classificação.</small></label>
            <label>Vínculo / cargo<input required maxLength={100} value={form.cargoVinculo} onChange={event => setForm({ ...form, cargoVinculo: event.target.value })} /></label>
            <div className="client-profile-field"><span>Data de cadastro</span><strong>{fields[4][1]}</strong></div>
            <div className="client-profile-field"><span>Status</span><strong>{fields[5][1]}</strong></div>
          </div> : <div className="client-profile-grid">{fields.map(([label, value]) => <div className="client-profile-field" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}
          {error && <p className="form-message" role="alert">{error}</p>}
          <div className="client-profile-actions">
            {editing ? <><button type="button" className="client-profile-action client-profile-action-muted" disabled={busy} onClick={() => { setEditing(false); setError(''); setForm({ nomeCompleto: client.nomeCompleto || '', email: client.email || '', telefone: client.telefone || '', organizacao: client.organizacao || '', cargoVinculo: client.cargoVinculo || '' }) }}>Cancelar edição</button><button type="submit" className="client-profile-action" disabled={busy}>{busy ? 'Salvando...' : 'Salvar alterações'}</button></> : <button type="button" className="client-profile-action" onClick={() => { setEditing(true); setError('') }}>Editar dados</button>}
          </div>
        </form>
        {canDeactivate && client.ativo !== false && <section className="client-profile-deactivation">
          {deactivationOpen ? <form onSubmit={deactivate}><div><strong>Desativar cadastro</strong><small>O acesso será desativado; reservas e histórico serão preservados.</small></div><label>Motivo<textarea required rows="3" maxLength={1000} value={deactivationReason} onChange={event => { setDeactivationReason(event.target.value); setDeactivationError('') }} /></label>{deactivationError && <p className="form-message" role="alert">{deactivationError}</p>}<div className="client-profile-actions"><button type="button" className="client-profile-action client-profile-action-muted" disabled={deactivationBusy} onClick={() => { setDeactivationOpen(false); setDeactivationError('') }}>Voltar</button><button type="submit" className="client-profile-action client-profile-action-danger" disabled={!deactivationReason.trim() || deactivationBusy}>{deactivationBusy ? 'Desativando...' : 'Confirmar desativação'}</button></div></form> : <button type="button" className="client-profile-action client-profile-action-danger" onClick={() => setDeactivationOpen(true)}>Desativar cadastro</button>}
        </section>}
        {canResetPassword && <section className="client-profile-deactivation client-password-reset">
          {resetResult ? <div className="temporary-password-result"><strong>Senha temporária gerada</strong><p>Copie e repasse ao usuário agora. Ela não será exibida novamente.</p><div><code>{resetResult}</code><button type="button" onClick={() => navigator.clipboard.writeText(resetResult).catch(() => setResetError('Não foi possível copiar automaticamente. Selecione e copie a senha.'))}>Copiar</button></div></div> : resetOpen ? <form onSubmit={resetPassword}>
            <div><strong>Redefinir senha</strong><small>As sessões atuais serão invalidadas e o usuário deverá criar uma senha nova no próximo acesso.</small></div>
            <label className="reset-password-option"><input type="radio" checked={generatePassword} onChange={() => setGeneratePassword(true)} /> Gerar automaticamente</label>
            <label className="reset-password-option"><input type="radio" checked={!generatePassword} onChange={() => setGeneratePassword(false)} /> Definir senha temporária</label>
            {!generatePassword && <label>Senha temporária<input required minLength="8" maxLength="64" type="password" autoComplete="new-password" value={manualPassword} onChange={event => setManualPassword(event.target.value)} /></label>}
            {resetError && <p className="form-message" role="alert">{resetError}</p>}
            <div className="client-profile-actions"><button type="button" className="client-profile-action client-profile-action-muted" disabled={resetBusy} onClick={() => { setResetOpen(false); setResetError('') }}>Cancelar</button><button type="submit" className="client-profile-action" disabled={resetBusy}>{resetBusy ? 'Redefinindo...' : 'Confirmar redefinição'}</button></div>
          </form> : <button type="button" className="client-profile-action" onClick={() => { setResetOpen(true); setResetError('') }}>Redefinir senha</button>}
        </section>}
      </>}
      {tab === 'Reservas' && <div className="client-history-list">{clientReservations.length ? clientReservations.map(item => <article key={item.idReserva}><div><strong>{item.tituloEvento}</strong><small>{item.dataReserva} · {item.horarioInicio}-{item.horarioFim} · {item.espaco || 'Espaço InPETU'}</small></div><span className={`status-pill ${item.statusReserva === 'Confirmada' ? 'status-confirmed' : item.statusReserva === 'Cancelada' ? 'status-cancelled' : 'status-pending'}`}><i />{reservationStatusLabel(item.statusReserva)}</span>{item.excedeCota && <span className="quota-exceeded-badge">Excede cota</span>}</article>) : <p className="empty-inline">Este cliente ainda não possui reservas.</p>}</div>}
      {tab === 'Dúvidas' && <div className="client-history-list">{clientTickets.length ? clientTickets.map(ticket => <article key={ticket.idDuvida}><div><strong>{ticket.statusAtendimento} · {new Date(ticket.dataEnvio).toLocaleDateString('pt-BR')}</strong><small>{ticket.mensagemDuvida}</small>{ticket.respostaEquipe && <small>Resposta da equipe: {ticket.respostaEquipe}</small>}</div></article>) : <p className="empty-inline">Nenhuma dúvida vinculada a este e-mail.</p>}</div>}
      {tab === 'Auditoria' && <div className="client-history-list">{clientAudit.length ? clientAudit.map((item, index) => <article key={`${item.time}-${index}`}><div><strong>{item.action} · {item.time}</strong><small>{item.user} · {item.detail}</small></div></article>) : <p className="empty-inline">Nenhum registro de auditoria deste cliente.</p>}</div>}
    </div>
  </Modal>
}
function Footer({ setView }) { return <footer className="site-footer"><div className="footer-main"><div><Logo variant="horizontalDark" /><p>Espaço para ideias. Conexões para transformar.</p></div><div className="footer-links"><span>EXPLORE</span><button onClick={() => setView('home')}>Espaços</button><button onClick={() => setView('calendar')}>Disponibilidade</button><button onClick={() => setView('help')}>Fale conosco</button></div><div className="footer-address"><span>ENCONTRE A GENTE</span><p><MapPin size={15} /> Sapiens Parque · Lote 73<br />Rod. SC-401, 6001 · Florianópolis, SC</p><a href="https://maps.google.com/?q=Sapiens+Parque+Florianopolis" target="_blank" rel="noreferrer">Abrir mapa <ExternalLink size={13} /></a></div></div><div className="footer-bottom"><span>© 2026 InPETU Hub · UFSC</span><span><ShieldCheck size={14} /> Seus dados tratados com transparência, conforme a LGPD.</span><span>Ciência que aproxima. </span></div></footer> }
function AppInner({ onCodeSent, onNavigate, initialView = 'default' }) {
  const [view, setCurrentView] = useState(() => initialView === 'default' ? getDefaultView() : initialView)
  useEffect(() => {
    setCurrentView(initialView === 'default' ? getDefaultView() : initialView)
  }, [initialView])
  function setView(nextView) {
    setCurrentView(nextView)
    const path = viewPaths[nextView]
    if (path) onNavigate(path)
  }
  const [spaces, setSpaces] = useState([])
  const [spacesLoaded, setSpacesLoaded] = useState(false)
  const [reservations, setReservations] = useState([])
  const [myReservations, setMyReservations] = useState([])
  const [myReservationsLoaded, setMyReservationsLoaded] = useState(false)
  const [dataError, setDataError] = useState('')
  const [bookingSpace, setBookingSpace] = useState(null)
  const [bookingSchedule, setBookingSchedule] = useState({ date: localDateValue(), time: '09:00' })
  const [bookingEndTime, setBookingEndTime] = useState('10:00')
  const [calendarQuery, setCalendarQuery] = useState({ date: '', kind: '', spaceId: '' })
  const [availabilityVersion, setAvailabilityVersion] = useState(0)
  const [user, setUser] = useState(getStoredUser)
  function updateCurrentUser(updated) {
    setUser(current => {
      const next = omitPersona({ ...current, ...updated })
      storeUser(next)
      return next
    })
  }
  function openLogin(destination = null) {
    if (destination) rememberLoginDestination(destination)
    setView('access')
  }
  function completeLogin(result) {
    const perfil = Number(result?.perfil ?? result?.idPerfil ?? 4)
    const nextUser = omitPersona({ ...result, perfil })
    storeUser(nextUser)
    setUser(nextUser)
    if (nextUser.senhaTemporaria) {
      setView('password-change')
      return
    }
    if (isCrmUser(nextUser)) {
      consumeLoginDestination()
      window.location.assign('/paineladm')
    } else {
      setView(consumeLoginDestination() || 'portal')
    }
  }
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
  async function logout() {
    try {
      await request('/auth/logout', { method: 'POST' })
    } catch (error) {
      setDataError(`Não foi possível confirmar o encerramento da sessão no servidor. ${error.message}`)
    }
    clearStoredUser()
    setUser(null)
    setView('home')
  }
  useEffect(() => {
    request('/espacos').then(data => {
      if (!Array.isArray(data)) throw new Error('A API retornou uma lista de espaços inválida.')
      setSpaces(data)
    }).catch(error => setDataError(error.message)).finally(() => setSpacesLoaded(true))
  }, [])
  useEffect(() => {
    localStorage.removeItem('inpetu-token')
  }, [])
  useEffect(() => {
    if (!user) {
      setMyReservations([])
      setMyReservationsLoaded(false)
      return
    }
    let active = true
    let refreshing = false
    let refreshTimer
    const refreshReservations = async () => {
      if (!active || refreshing) return
      refreshing = true
      try {
        const items = await request('/reservas/minhas')
        if (!Array.isArray(items)) throw new Error('A API retornou uma lista de reservas inválida.')
        if (active) setMyReservations(items)
      } catch (error) {
        if (active && error.status === 401) {
          clearStoredUser()
          setUser(null)
        } else if (active) {
          setDataError(error.message)
        }
      } finally {
        refreshing = false
        if (active) {
          setMyReservationsLoaded(true)
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
    request('/auth/session')
      .then(session => {
        if (!active) return null
        const normalized = omitPersona({ ...session, perfil: Number(session.perfil ?? session.idPerfil ?? 4) })
        storeUser(normalized)
        setUser(current => {
          const next = omitPersona({ ...current, ...normalized })
          return current && Object.entries(normalized).every(([key, value]) => current[key] === value) ? current : next
        })
        if (normalized.senhaTemporaria) {
          setView('password-change')
          return null
        }
        if (isCrmUser(normalized) && new URLSearchParams(window.location.search).get('legacyAdmin') !== '1') {
          window.location.replace('/paineladm')
          return null
        }
        window.addEventListener('focus', refreshNow)
        document.addEventListener('visibilitychange', refreshWhenVisible)
        return refreshReservations()
      })
      .catch(error => {
        if (!active) return
        if (error.status === 401) {
          clearStoredUser()
          setUser(null)
        } else {
          setDataError(error.message)
        }
      })
      .finally(() => { if (active) setMyReservationsLoaded(true) })
    return () => {
      active = false
      window.clearTimeout(refreshTimer)
      window.removeEventListener('focus', refreshNow)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [user?.idUsuario, user?.email])
  function updateCancel(item, reason) {
    const update = items => items.map(r => r.idReserva === item.idReserva ? { ...r, ...item, statusReserva: 'Cancelada', motivoCancelamento: reason } : r)
    setReservations(update); setMyReservations(update)
  }
  function updateSaved(reserva) {
    const saved = { ...reserva, espaco: bookingSpace?.nomeEspaco, solicitante: user?.nome || 'Você' }
    setReservations(items => [saved, ...items]); setMyReservations(items => [saved, ...items])
    setAvailabilityVersion(version => version + 1)
  }
  function passwordChanged() {
    const updated = { ...user, senhaTemporaria: false }
    updateCurrentUser(updated)
    if (isCrmUser(updated)) {
      consumeLoginDestination()
      window.location.assign('/paineladm')
    } else {
      setView(consumeLoginDestination() || 'portal')
    }
  }
  if (view === 'password-change') {
    return <div className="public-app"><PasswordChangePage user={user} onLogout={logout} onPasswordChanged={passwordChanged} /></div>
  }
  if (view === 'crm') return <Crm user={user} setUser={setUser} onReturnHome={() => { setView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} spaces={spaces} setSpaces={setSpaces} reservations={reservations} setReservations={setReservations} />
  return (
    <div className="public-app">
      <Header view={view} setView={setView} openLogin={() => setView('access')} onOpenCalendar={openCalendar} user={user} onLogout={logout} onUserUpdate={updateCurrentUser} />
      {dataError && <p className="form-message" role="alert">{dataError} Atualize a página para tentar novamente.</p>}
      {view === 'home' && <Home spaces={spaces} spacesLoaded={spacesLoaded} onConsultSpace={showSpaceAvailability} setSignupOpen={() => setView('signup')} onOpenCalendar={openCalendar} onSearchAvailability={(date, kind) => { setCalendarQuery({ date, kind, spaceId: '' }); setView('calendar'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />}
      {view === 'portal' && user ? <PortalHome user={user} items={myReservations} reservationsLoaded={myReservationsLoaded} onOpenCalendar={openCalendar} onOpenReservations={() => setView('reservations')} /> : view === 'portal' && <AccessPage onLogin={completeLogin} onSignup={() => setView('signup')} />}
      {view === 'calendar' && <CalendarPage spaces={spaces} spacesLoaded={spacesLoaded} onReserve={openBooking} initialDate={calendarQuery.date || localDateValue()} initialKind={calendarQuery.kind} initialSpaceId={calendarQuery.spaceId} availabilityVersion={availabilityVersion} />}
      {view === 'reservations' && user ? <ReservationsPage items={myReservations} onCancel={updateCancel} /> : view === 'reservations' && <AccessPage onLogin={completeLogin} onSignup={() => setView('signup')} />}
      {view === 'help' && <HelpPage />}
      {view === 'access' && <AccessPage onLogin={completeLogin} onSignup={() => setView('signup')} />}
      {view === 'signup' && <SignupPage onBack={() => setView('access')} onCodeSent={onCodeSent} />}
      {!['access', 'signup'].includes(view) && <Footer setView={setView} />}
      <BookingModal space={bookingSpace} close={() => setBookingSpace(null)} onSaved={updateSaved} openLogin={() => openLogin('calendar')} initialDate={bookingSchedule.date} initialTime={bookingSchedule.time} initialEndTime={bookingEndTime} user={user} />
    </div>
  )
}

export default function App() {
  const readLocation = () => {
    const params = new URLSearchParams(window.location.search)
    const requestedView = params.get('view')
    const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
    return {
      pathname,
      view: params.get('legacyAdmin') === '1'
        ? 'crm'
        : routeViews[pathname] || (pathname === '/' && ['home', 'portal', 'reservations', 'calendar', 'signup', 'access', 'help', 'password-change'].includes(requestedView) ? requestedView : 'default'),
    }
  }
  const [location, setLocation] = useState(readLocation)
  useEffect(() => {
    window.addEventListener('popstate', readLocation)
    return () => window.removeEventListener('popstate', readLocation)
  }, [])
  function navigate(url, replace = false) {
    if (replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
    setLocation(readLocation())
  }

  if (location.pathname === '/confirmar') {
    return <EmailConfirmationPage />
  }
  if (location.pathname === '/verificar-email') {
    return <EmailVerificationPage
      email={sessionStorage.getItem('inpetu-code-email') || ''}
      onCorrectEmail={() => navigate('/?view=signup', true)}
      onConfirmed={() => navigate('/', true)}
    />
  }
  return <AppInner initialView={location.view} onNavigate={navigate} onCodeSent={email => {
    sessionStorage.setItem('inpetu-code-email', email)
    sessionStorage.setItem('inpetu-code-sent-at', String(Date.now()))
    navigate('/verificar-email')
  }} />
}
