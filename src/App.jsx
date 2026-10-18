import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems, Tab, TabGroup, TabList, TabPanel, TabPanels, Transition, TransitionChild } from '@headlessui/react'
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bell, Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, DoorOpen, Download, Eye, EyeOff, ExternalLink, FileText, Filter, GraduationCap, Home as HomeIcon, LayoutDashboard, ListChecks, LockKeyhole, Mail, MapPin, Menu as MenuIcon, MessageCircle, MoreHorizontal, Plus, Search, ShieldCheck, SlidersHorizontal, Users, X } from 'lucide-react'
import { personas, personaQuotaLabel } from './personas.js'
import { formatRelativeNotificationDate, normalizeNotificationMessage } from './notifications.js'
import { BRAND_LOGOS } from './brand.js'
import { CountUp, Reveal, Stagger, StaggerItem, useScrollProgress } from './motion/index.js'

const CalendarPage = lazy(() => import('./CalendarPage.jsx'))
const Crm = lazy(() => import('./CrmPage.jsx'))
const loadPublicPage = name => lazy(() => import('./PublicPages.jsx').then(pages => ({ default: pages[name] })))
const optionalFeatureModules = Object.values(import.meta.glob('./mural/*.jsx', { eager: true }))
  .map(module => module.default)
  .filter(Boolean)
const optionalFeatureRoutes = optionalFeatureModules.flatMap(module => module.routes || [])
const AccessPage = loadPublicPage('AccessPage')
const SignupPage = loadPublicPage('SignupPage')
const PasswordChangePage = loadPublicPage('PasswordChangePage')
const EmailVerificationPage = loadPublicPage('EmailVerificationPage')
const EmailConfirmationPage = loadPublicPage('EmailConfirmationPage')
const ReservationsPage = loadPublicPage('ReservationsPage')
const PortalHome = loadPublicPage('PortalHome')
const HelpPage = loadPublicPage('HelpPage')
const PageLoading = () => <p className="page-loading" role="status">Carregando página...</p>
export const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'
export const omitPersona = user => {
  if (!user) return user
  const { idPersona, persona, ...safeUser } = user
  return safeUser
}
const SESSION_EXPIRED_MESSAGE = 'Sua sessão expirou. Entre novamente.'
let sessionExpiryReported = false
const getStoredUser = () => {
  try { return omitPersona(JSON.parse(localStorage.getItem('inpetu-user') || 'null')) } catch { return null }
}
export const storeUser = user => localStorage.setItem('inpetu-user', JSON.stringify(omitPersona(user)))
export const clearStoredUser = () => {
  localStorage.removeItem('inpetu-user')
  localStorage.removeItem('inpetu-token')
  sessionStorage.removeItem('inpetu-login-return-view')
}
const isCrmUser = user => [1, 2, 3].includes(Number(user?.perfil ?? user?.idPerfil))
export const getProfileRoleLabel = user => ({
  1: 'Coordenador',
  2: 'Gestor de espaços',
  3: 'Atendente',
  4: 'Solicitante',
}[Number(user?.perfil ?? user?.idPerfil)] || 'Solicitante')
export const getProfileMenuRole = user => {
  const role = getProfileRoleLabel(user)
  const name = String(user?.nome || user?.nomeCompleto || '').trim()
  return name.toLocaleLowerCase('pt-BR').includes(role.toLocaleLowerCase('pt-BR')) ? '' : role
}
const LOGIN_RETURN_VIEW_KEY = 'inpetu-login-return-view'
const internalViews = new Set(['home', 'calendar', 'reservations', ...optionalFeatureRoutes.map(route => route.view)])
const routeViews = {
  '/meu-portal': 'portal',
  '/minhas-reservas': 'reservations',
  '/agendar': 'calendar',
  '/login': 'access',
  '/cadastro': 'signup',
  '/contato': 'help',
  '/termos': 'terms',
  '/privacidade': 'privacy',
  '/paineladm': 'crm',
}
const viewPaths = {
  home: '/?view=home',
  portal: '/meu-portal',
  reservations: '/minhas-reservas',
  calendar: '/agendar',
  access: '/login',
  signup: '/cadastro',
  help: '/contato',
  terms: '/termos',
  privacy: '/privacidade',
  'password-change': '/?view=password-change',
  crm: '/?legacyAdmin=1',
}
const LEGAL_NOTICE_VERSION = '2026-10-v1'
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
export const BOOKING_DRAFT_KEY = 'inpetu-booking-draft'
export function saveBookingDraft(space, form) {
  if (!space?.idEspaco || !form) throw new Error('Não foi possível guardar os dados desta solicitação.')
  sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify({
    spaceId: space.idEspaco,
    space,
    form,
  }))
}
export function readBookingDraft() {
  const saved = sessionStorage.getItem(BOOKING_DRAFT_KEY)
  if (!saved) return null
  try {
    const draft = JSON.parse(saved)
    if (draft?.space?.idEspaco && draft?.form) return draft
    sessionStorage.removeItem(BOOKING_DRAFT_KEY)
    return null
  } catch {
    sessionStorage.removeItem(BOOKING_DRAFT_KEY)
    return null
  }
}
export function consumeBookingDraft(spaceId) {
  const draft = readBookingDraft()
  if (!draft || String(draft.spaceId) !== String(spaceId)) return null
  sessionStorage.removeItem(BOOKING_DRAFT_KEY)
  return draft
}
export const phoneDigits = value => {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2)
  return digits.slice(0, 11)
}
export const formatBrazilianPhone = value => {
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
export const reservationStatusLabel = status => status === 'Confirmada' ? 'Aprovado' : status
export const reservationStatusClass = status => status === 'Confirmada' ? 'status-confirmed' : status === 'Cancelada' ? 'status-cancelled' : 'status-pending'
export const isGuidedTour = type => type?.trim().toLocaleLowerCase('pt-BR') === 'visita guiada'
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
const catalogRoomImages = new Set([
  'auditorio.jpg',
  'sala-reuniao.jpg',
  'coworking.jpg',
  'sala-reuniao-1-coworking.jpg',
  'sala-reuniao-2-coworking.jpg',
  'sala-pre-incubacao.jpg',
  'sala-maker-via.jpg',
  'sala-via-hub.jpg',
  'sala-distrito-inovacao.jpg',
])
const getRoomImage = space => space?.arquivoImagem && space?.idEspaco && !catalogRoomImages.has(space.arquivoImagem)
  ? `${API}/espacos/${space.idEspaco}/imagem?v=${encodeURIComponent(space.arquivoImagem)}`
  : roomPhotos[normalizeRoomName(space?.nomeEspaco)]
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
export const localDateValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const saoPauloDateTime = () => {
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
export const calendarDaysUntil = value => {
  const [year, month, day] = value.split('-').map(Number)
  const now = new Date()
  return (Date.UTC(year, month - 1, day) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000
}
export const unavailableDeadlineLabel = date => date
  ? `Previsão de retorno: ${new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`
  : 'Prazo indeterminado'
export const addMinutesToTime = (time, minutes) => {
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
export async function request(path, options = {}) {
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
  if (response.status === 401 && path !== '/auth/login' && getStoredUser()) {
    clearStoredUser()
    if (!sessionExpiryReported) {
      sessionExpiryReported = true
      window.dispatchEvent(new Event('inpetu-session-expired'))
    }
  }
  if (response.ok && path === '/auth/login') sessionExpiryReported = false
  if (response.status === 403 && /^\/espacos\/[^/]+\/status$/.test(path)) {
    throw new Error('A API recusou a alteração (HTTP 403). O perfil deve ser Coordenador ou Gestor de Espaços. Se você já entrou com um desses perfis, reinicie o backend Spring Boot e faça login novamente para carregar as regras atualizadas.')
  }
  if (response.status === 403 && /^\/organizacoes\/[^/]+\/descredenciar$/.test(path)) {
    throw new Error('A API recusou a exclusão (HTTP 403). Essa ação exige perfil Coordenador. Se você já entrou com esse perfil, reinicie o backend Spring Boot e faça login novamente para carregar as regras atualizadas.')
  }
  if (response.status === 401 && path === '/auth/login') {
    const error = new Error('E-mail ou senha incorretos. Confirme que está usando uma conta cadastrada.')
    error.status = response.status
    throw error
  }
  if (response.status === 403 && path === '/auth/login') {
    const error = new Error('A API bloqueou o login (HTTP 403). Atualize o site e a API para a mesma versão e verifique as permissões da conta.')
    error.status = response.status
    throw error
  }
  if (!response.ok) {
    const responseMessage = body?.detail || body?.message || body?.mensagem || body?.title || body?.error
    const retryAfterMessage = response.status === 429
      ? formatRetryAfterMessage(response.headers?.get?.('Retry-After'))
      : null
    const selectedMessage = response.status === 401 && path !== '/auth/login'
      ? body?.mensagem || SESSION_EXPIRED_MESSAGE
      : retryAfterMessage || responseMessage || `Falha na solicitação (HTTP ${response.status}).`
    const message = /forbidden/i.test(String(selectedMessage))
      ? response.status === 401 ? SESSION_EXPIRED_MESSAGE : response.status === 403 ? 'Você não tem permissão para esta ação.' : `Falha na solicitação (HTTP ${response.status}).`
      : selectedMessage
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  return body
}
function formatRetryAfterMessage(value) {
  if (!value) return 'Muitas tentativas. Tente novamente em alguns minutos.'
  const seconds = Number(value)
  const retryAt = Number.isFinite(seconds) && seconds >= 0
    ? Date.now() + seconds * 1000
    : Date.parse(value)
  if (!Number.isFinite(retryAt)) return 'Muitas tentativas. Tente novamente em alguns minutos.'
  const minutes = Math.max(1, Math.ceil((retryAt - Date.now()) / 60_000))
  return `Muitas tentativas. Tente novamente em ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`
}
export function uploadQuestion(data, file, onProgress) {
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
export function Logo({ variant = 'horizontalLight', className = '' }) {
  return <img className={`brand-logo brand-logo-${variant} ${className}`} src={BRAND_LOGOS[variant]} alt="InPETU hub" />
}
export function Button({ children, variant = 'primary', icon: Icon, className = '', ...props }) {
  return <button className={`button button-${variant} icon-text ${className}`} {...props}>{Icon && <Icon size={17} strokeWidth={1.8} />}{children}</button>
}
export function PhoneInput({ value, onChange, ...props }) {
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
export function PasswordInput(props) {
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
export function Modal({ open, close, title, children, wide = false }) {
  return <Transition appear show={open} as={Fragment}><Dialog as="div" className="dialog-root" onClose={close}>
    <TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="dialog-backdrop" /></TransitionChild>
    <div className="dialog-wrap"><TransitionChild as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-3" enterTo="opacity-100 translate-y-0" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-3"><DialogPanel className={`dialog-panel ${wide ? 'dialog-wide' : ''}`}>
      <div className="dialog-heading"><DialogTitle as={Title} className="dialog-title"><span className="dialog-title-emoji" aria-hidden="true">✨</span>{title}</DialogTitle><button className="icon-button" aria-label="Fechar" onClick={close}><X size={19} /></button></div>{children}
    </DialogPanel></TransitionChild></div>
  </Dialog></Transition>
}
export function ImageUploadField({
  label,
  onFile,
  onRemove,
  previewSrc = '',
  fileName = '',
  disabled = false,
  previewWhileUploading = false,
  error = '',
}) {
  const [dragging, setDragging] = useState(false)
  const [localFile, setLocalFile] = useState(null)
  const [localError, setLocalError] = useState('')
  const [localPreview, setLocalPreview] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!localFile) {
      setLocalPreview('')
      return
    }
    const preview = URL.createObjectURL(localFile)
    setLocalPreview(preview)
    return () => URL.revokeObjectURL(preview)
  }, [localFile])

  async function selectFile(file) {
    if (!file || disabled) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setLocalError('Escolha uma imagem JPG, PNG ou WebP.')
      setLocalFile(null)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setLocalError('A imagem deve ter até 5 MB.')
      setLocalFile(null)
      return
    }
    setLocalError('')
    if (previewWhileUploading) setLocalFile(file)
    try {
      const result = onFile?.(file)
      const succeeded = result instanceof Promise ? await result : result
      if (succeeded === false) return
      if (previewWhileUploading) setLocalFile(null)
    } catch (uploadError) {
      setLocalError(uploadError.message || 'Não foi possível enviar esta imagem.')
      if (previewWhileUploading) setLocalFile(null)
    }
  }

  const imageSrc = previewSrc || localPreview
  const imageName = fileName || localFile?.name
  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    selectFile(event.dataTransfer.files?.[0])
  }

  return <div className="image-upload-field">
    <span className="image-upload-label">{label}</span>
    <label
      className={`image-dropzone ${dragging ? 'image-dropzone-active' : ''} ${imageSrc ? 'image-dropzone-has-preview' : ''}`}
      onDragEnter={event => { event.preventDefault(); setDragging(true) }}
      onDragOver={event => event.preventDefault()}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false) }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={label}
        disabled={disabled}
        onChange={event => {
          selectFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      {imageSrc
        ? <><img src={imageSrc} alt={`Prévia: ${imageName || label}`} /><span className="image-dropzone-copy"><strong>{imageName || 'Imagem selecionada'}</strong><small>Clique ou solte outra imagem para substituir</small></span></>
        : <span className="image-dropzone-copy"><strong>Solte a imagem aqui ou clique para escolher</strong><small>JPG, PNG ou WebP, até 5 MB</small></span>}
    </label>
    {imageSrc && onRemove && <button type="button" className="image-upload-remove" disabled={disabled} onClick={() => { setLocalFile(null); setLocalError(''); onRemove() }}>Remover imagem</button>}
    {(localError || error) && <p className="form-message" role="alert">{localError || error}</p>}
  </div>
}
export function RoomPhoto({ space, alt, className = '' }) {
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
export function NotificationCenter({ user }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const containerRef = useRef(null)
  useEffect(() => {
    if (!user) {
      setItems([])
      setError('')
      setLoading(false)
      return
    }
    let active = true
    const refresh = async () => {
      setLoading(true)
      try {
        const notifications = await request('/notificacoes/minhas')
        if (active) { setItems(notifications); setError('') }
      } catch (loadError) {
        if (active) setError(/forbidden/i.test(loadError.message)
          ? loadError.status === 403 ? 'Você não tem permissão para consultar as notificações.' : 'Não foi possível carregar as notificações.'
          : loadError.message)
      } finally {
        if (active) setLoading(false)
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
      setError(/forbidden/i.test(markError.message) ? 'Você não tem permissão para alterar as notificações.' : markError.message)
    }
  }
  async function markAllRead() {
    try {
      await request('/notificacoes/lidas', { method: 'PATCH' })
      setItems(current => current.map(item => ({ ...item, lida: true })))
      setError('')
    } catch (markError) {
      setError(/forbidden/i.test(markError.message) ? 'Você não tem permissão para alterar as notificações.' : markError.message)
    }
  }
  if (!user) return null
  const unread = items.filter(item => !item.lida).length
  return <div className="notification-center" ref={containerRef}>
    <button type="button" className="notification-trigger" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ''}`} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <Bell size={19} />{unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <section className="notification-popover" aria-label="Notificações">
      <div className="notification-heading"><strong>Notificações</strong><div><button type="button" className="notification-mark-all" onClick={markAllRead} disabled={!unread}>Marcar todas como lidas</button><button type="button" className="notification-close" aria-label="Fechar notificações" onClick={() => setOpen(false)}><X size={16} /></button></div></div>
      {error && <p className="notification-error" role="alert">{error}</p>}
      {loading && !items.length && !error ? <p className="notification-empty" role="status">Carregando notificações...</p> : items.length ? <div className="notification-list">{items.slice(0, 12).map(item => {
        const Icon = notificationIcons[item.tipo] || Bell
        const typeClass = String(item.tipo || 'geral').toLocaleLowerCase('pt-BR').replaceAll('_', '-')
        return <button type="button" key={item.idNotificacao} className={`notification-item ${item.lida ? '' : 'notification-unread'}`} onClick={() => markRead(item)}>
        <span className={`notification-type-icon notification-type-${typeClass}`} aria-hidden="true"><Icon size={18} /></span>
        <span><strong>{item.titulo}</strong><small>{normalizeNotificationMessage(item.mensagem)}</small><time dateTime={item.dataHora} title={new Date(item.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}>{formatRelativeNotificationDate(item.dataHora)}</time>{item.statusEmail !== 'ENVIADO' && <em>E-mail {item.statusEmail === 'DESATIVADO' ? 'desativado' : 'não enviado: verifique a configuração de envio'}</em>}</span>
        {!item.lida && <i aria-label="Não lida" />}
      </button>
      })}</div> : !error && <p className="notification-empty">Você não tem notificações</p>}
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
export function ProfileDialog({ open, close, user, onUserUpdate }) {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ nomeCompleto: '', telefone: '', organizacao: '', cargoVinculo: '' })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profileLoadAttempt, setProfileLoadAttempt] = useState(0)
  const [passwordForm, setPasswordForm] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState('')
  const [visiblePasswords, setVisiblePasswords] = useState({})
  const photoInput = useRef(null)
  const perfilLabel = getProfileRoleLabel(user)
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
    setProfile(null)
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
  }, [open, profileLoadAttempt])

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
    {loading ? <p className="portal-empty" role="status">Carregando seus dados...</p> : !profile && error ? <div className="profile-load-error"><p className="form-message" role="alert">{error}</p><Button variant="outline" onClick={() => setProfileLoadAttempt(attempt => attempt + 1)}>Tentar de novo</Button></div> : profile && <div className="profile-editor">
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
function Header({ view, setView, openLogin, onOpenCalendar, user, onLogout, onUserUpdate, optionalNavigation = [] }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileDetailsOpen, setProfileDetailsOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const updateCompact = () => setCompact(window.scrollY > 24)
    updateCompact()
    window.addEventListener('scroll', updateCompact, { passive: true })
    return () => window.removeEventListener('scroll', updateCompact)
  }, [])
  const goTo = (id) => { setView('home'); setMenuOpen(false); window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0) }
  const perfilLabel = getProfileMenuRole(user)
  return <header className={`site-header reference-header ${compact ? 'site-header-compact' : ''}`}><div className="header-inner"><button className="logo-button" aria-label="InPETU hub — página inicial" onClick={() => { setView(user && !isCrmUser(user) ? 'portal' : 'home'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Logo /></button>
    <nav id="public-navigation" className={`main-nav ${menuOpen ? 'nav-open' : ''}`}><button className={view === 'home' || view === 'portal' ? 'nav-active' : ''} onClick={() => { setView(user && !isCrmUser(user) ? 'portal' : 'home'); window.scrollTo({ top: 0, behavior: 'smooth' }); setMenuOpen(false) }}>{user && !isCrmUser(user) ? 'Meu portal' : 'Início'}</button><button onClick={() => goTo('spaces')}>Nossos Espaços</button>{optionalNavigation.map(item => <button key={item.view} className={view === item.view ? 'nav-active' : ''} onClick={() => { setView(item.view); window.scrollTo({ top: 0, behavior: 'smooth' }); setMenuOpen(false) }}>{item.label}</button>)}<button className={view === 'help' ? 'nav-active' : ''} onClick={() => { setView('help'); setMenuOpen(false) }}>Fale Conosco</button>{!user && <button className="mobile-nav-login" onClick={() => { openLogin(); setMenuOpen(false) }}>Entrar</button>}</nav>
    <div className="header-actions">{user ? <div className="profile-control"><NotificationCenter user={user} /><Menu as="div" className="profile-switcher"><MenuButton type="button" className="profile-trigger" aria-label={`Menu da conta de ${user.nome || user.email || 'usuário'}`}><Avatar user={user} tamanho={34} className="profile-avatar" /><span className="profile-meta"><strong>{user.nome || user.email || 'Perfil'}</strong>{perfilLabel && <small>{perfilLabel}</small>}</span><ChevronDown className="profile-chevron" size={16} aria-hidden="true" /></MenuButton><MenuItems className="profile-menu"><MenuItem><button type="button" onClick={() => setProfileDetailsOpen(true)}>Meu perfil</button></MenuItem><MenuItem><button type="button" onClick={() => setView('reservations')}>Minhas reservas</button></MenuItem>{isCrmUser(user) && <MenuItem><a href="/paineladm">Painel da equipe</a></MenuItem>}<div className="profile-menu-divider" role="separator" /><MenuItem><button type="button" className="profile-menu-signout" onClick={() => onLogout?.()}>Sair da conta</button></MenuItem></MenuItems></Menu><ProfileDialog open={profileDetailsOpen} close={() => setProfileDetailsOpen(false)} user={user} onUserUpdate={onUserUpdate} /></div> : <button className="team-link reference-login" onClick={() => { openLogin(); setMenuOpen(false) }}>Entrar</button>}<Button icon={CalendarDays} aria-label="Agendar Espaço" className="reference-header-cta" onClick={() => { onOpenCalendar(); setMenuOpen(false) }}><span className="header-cta-full">Agendar Espaço</span><span className="header-cta-short">Agendar</span></Button></div><button className="mobile-menu icon-button" aria-controls="public-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}><MenuIcon /></button>
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
        <Button icon={CalendarDays} onClick={() => { onClose(); onConsultSpace(space) }}>{space.ativo === false ? 'Ver motivo' : 'Ver horários'}</Button>
      </div>
    </div>
  </Modal>
}
function Home({ spaces, spacesLoaded, onConsultSpace, onSearchAvailability, onOpenCalendar, user, optionalGallery: OptionalGallery, openOptionalFeature, openOptionalFeatureLogin }) {
  const [filter, setFilter] = useState('Todos os espaços')
  const filtered = filter === 'Todos os espaços' ? spaces : spaces.filter(space => space.tipoEspaco === filter)
  const types = ['Todos os espaços', ...new Set(spaces.map(space => space.tipoEspaco))]
  const activeSpaces = spaces.filter(space => space.ativo !== false)
  const [gallerySpace, setGallerySpace] = useState(null)
  const todayValue = localDateValue()
  const [searchType, setSearchType] = useState('')
  const [searchDate, setSearchDate] = useState(todayValue)
  const heroSpace = activeSpaces[0]
  return <>
    <Reveal as="section" className="hero-shell reference-hero">
      <div className="reference-hero-copy">
        <div className="reference-location icon-text"><MapPin size={17} /><span>Lote 73 · Sapiens Parque · Florianópolis</span></div>
        <Title as="h1" className="reference-heading">Um espaço para suas ideias <em>ganharem vida.</em></Title>
        <p className="reference-description">Encontre o ambiente certo para se reunir, aprender e fazer acontecer no InPETU Hub.</p>
        <form id="availability-search" className="availability-search" onSubmit={event => { event.preventDefault(); onSearchAvailability(searchDate, searchType) }}>
          <label><span>Tipo de espaço</span><select value={searchType} onChange={event => setSearchType(event.target.value)}><option value="">Todos os espaços</option>{[...new Set(spaces.map(space => space.tipoEspaco))].map(type => <option value={type} key={type}>{type}</option>)}</select></label>
          <label><span>Data desejada</span><input type="date" min={todayValue} value={searchDate} onChange={event => setSearchDate(event.target.value)} /></label>
          <Button type="submit" icon={Search}>Consultar horários</Button>
        </form>
        <dl className="reference-stats">
          <div><dt><CountUp value={22} from={8} format={value => `08h-${Math.round(value)}h`} /></dt><dd>Horário de funcionamento</dd></div>
          <div><dt>{spacesLoaded ? <CountUp value={spaces.filter(space => space.ativo !== false).length} /> : '...'}</dt><dd>Ambientes ativos</dd></div>
          <div><dt>UFSC</dt><dd>Inovação em Florianópolis</dd></div>
        </dl>
      </div>
      <div className="reference-hero-images">
        {heroSpace && <RoomPhoto className="reference-hero-photo" space={heroSpace} alt={`Foto de ${heroSpace.nomeEspaco}`} />}
      </div>
    </Reveal>
    <Reveal as="section" id="spaces" className="spaces-section"><div className="section-top"><div><Title as="h2">Nossos <em>Espaços</em></Title><p>Ambientes preparados para capacitações, eventos, mentorias e visitas técnicas.</p></div><button className="all-spaces-link icon-text" onClick={onOpenCalendar}>Abrir calendário completo <ArrowRight size={16} /></button></div>
      <div className="filter-row"><div className="filter-label icon-text"><SlidersHorizontal size={15} /> EXPLORE POR TIPO</div><div className="filter-options">{types.map(type => <button key={type} className={`filter-chip ${filter === type ? 'filter-chip-active' : ''}`} onClick={() => setFilter(type)}>{type}</button>)}</div></div>
      {!spacesLoaded && <p className="empty-inline" role="status">Carregando espaços...</p>}
      {spacesLoaded && spaces.length === 0 && <p className="empty-inline" role="status">Nenhum espaço cadastrado no momento.</p>}
      <Stagger as="div" key={filter} className="space-grid">
        {filtered.map(space => {
          const unavailable = space.ativo === false
          const guidedTourSpace = isGuidedTour(space.tipoEspaco)
          const showSpaceCategory = normalizeRoomName(space.tipoEspaco) !== normalizeRoomName(space.nomeEspaco)
          return <StaggerItem
            as="article"
            className={`space-card ${unavailable ? 'space-card-unavailable' : ''}`}
            key={space.idEspaco}
          >
            <div className="space-image">
              <RoomPhoto space={space} alt={`Foto de ${space.nomeEspaco}`} />
              <button type="button" className="space-image-open" onClick={() => setGallerySpace(space)} aria-label={`Ver foto de ${space.nomeEspaco}`}>
                Ver foto <ArrowUpRight size={15} />
              </button>
              {unavailable
                ? <span className="space-unavailable-overlay">Indisponível</span>
                : <span className="availability-dot"><i /> Disponível</span>}
            </div>
            <div className="space-info">
              {showSpaceCategory && <span className="space-category">{space.tipoEspaco}</span>}
              <Title as="h3">{space.nomeEspaco}</Title>
              <span className="space-capacity icon-text"><Users size={16} /> Até {space.capacidadePessoas || 20} pessoas</span>
              <p className="space-description">
                {unavailable
                  ? space.motivoIndisponibilidade || 'Este espaço está temporariamente indisponível.'
                  : space.descricao || space.equipamentosDisponiveis || 'Um ambiente versátil para as suas ideias.'}
              </p>
              {unavailable && <small className="unavailable-deadline">{unavailableDeadlineLabel(space.dataPrevisaoRetorno)}</small>}
              <button className="space-cta" onClick={() => onConsultSpace(space)}>
                {unavailable ? 'Ver motivo' : guidedTourSpace ? 'Solicitar visita' : 'Ver horários'}
              </button>
            </div>
          </StaggerItem>
        })}
      </Stagger>
    </Reveal>
    {OptionalGallery && <OptionalGallery API={API} request={request} Modal={Modal} Button={Button} ImageUploadField={ImageUploadField} Reveal={Reveal} Title={Title} user={user} onOpenLogin={openOptionalFeatureLogin} preview onViewFull={openOptionalFeature} />}
    {gallerySpace && <RoomGallery space={gallerySpace} onClose={() => setGallerySpace(null)} onConsultSpace={onConsultSpace} />}
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
    const defaults = { dataReserva: initialDate || localDateValue(), horarioInicio, horarioFim: guidedTour ? initialEndTime || '' : initialEndTime || addMinutesToTime(horarioInicio, 30), tituloEvento: '', descricaoFinalidade: '', quantidadeParticipantes: '', telefoneContato: phoneDigits(user?.telefone) }
    const draft = consumeBookingDraft(space.idEspaco)
    setForm({ ...defaults, ...(draft?.form || {}) })
    setMessage('')
  }, [space, initialDate, initialTime, initialEndTime, guidedTour, user?.telefone])
  async function submit(event) {
    event.preventDefault()
    if (form.telefoneContato && !isValidBrazilianMobile(formatBrazilianPhone(form.telefoneContato))) {
      setMessage('Informe um celular válido para contato sobre a reserva.')
      return
    }
    if (!user) {
      try {
        saveBookingDraft(space, form)
        close()
        openLogin()
      } catch (error) {
        setMessage(error.message)
      }
      return
    }
    setBusy(true); setMessage('')
    try {
      const saved = await request('/reservas', { method: 'POST', body: JSON.stringify({ ...form, quantidadeParticipantes: guidedTour ? Number(form.quantidadeParticipantes) : null, idEspaco: space.idEspaco }) })
      onSaved(saved); close()
    } catch (error) {
      if (error.status === 401) {
        try {
          saveBookingDraft(space, form)
          close()
          openLogin()
          return
        } catch (draftError) {
          setMessage(draftError.message)
          return
        }
      }
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
      <label><span>{guidedTour ? 'Data preferida da visita' : 'Data do encontro'} <span className="required-indicator" aria-hidden="true">*</span></span><input required type="date" min={localDateValue()} value={form.dataReserva} onChange={e => setForm({ ...form, dataReserva: e.target.value })} /></label><div className="field-pair"><label><span>{guidedTour ? 'Horário preferido de início' : 'Início'} <span className="required-indicator" aria-hidden="true">*</span></span><input required type="time" min="08:00" max="21:30" step="1800" value={form.horarioInicio} onChange={e => setForm({ ...form, horarioInicio: e.target.value })} /></label><label><span>{guidedTour ? 'Horário preferido de término' : 'Fim'} <span className="required-indicator" aria-hidden="true">*</span></span><input required type="time" min={form.horarioInicio || '08:30'} max="22:00" step="1800" value={form.horarioFim} onChange={e => setForm({ ...form, horarioFim: e.target.value })} /></label></div>
      {guidedTour && <label>Quantidade de visitantes<input required type="number" min="1" max={space?.capacidadePessoas || 20} value={form.quantidadeParticipantes} onChange={e => setForm({ ...form, quantidadeParticipantes: e.target.value })} /><small>Capacidade máxima: {space?.capacidadePessoas || 20} pessoas.</small></label>}
      <label><span>{guidedTour ? 'Nome do grupo ou da instituição' : 'Nome do encontro'} <span className="required-indicator" aria-hidden="true">*</span></span><input required maxLength="150" placeholder={guidedTour ? 'Ex.: Turma de Engenharia da UFSC' : 'Ex.: Oficina de prototipagem'} value={form.tituloEvento} onChange={e => setForm({ ...form, tituloEvento: e.target.value })} /></label><label><span>{guidedTour ? 'Objetivo ou observações da visita' : 'O que você está planejando?'} <span className="required-indicator" aria-hidden="true">*</span></span><textarea required rows="3" placeholder={guidedTour ? 'Conte brevemente o perfil do grupo e o que gostaria de conhecer' : 'Conte um pouco sobre o encontro'} value={form.descricaoFinalidade} onChange={e => setForm({ ...form, descricaoFinalidade: e.target.value })} /></label>
      {message && <p className="form-message" role="alert">{message}</p>}<Button type="submit" icon={ArrowRight} disabled={busy}>{busy ? 'Enviando...' : guidedTour ? 'Enviar pedido de visita' : 'Continuar solicitação'}</Button><p className="form-footnote icon-text"><ShieldCheck size={14} /> Seus dados são tratados de acordo com a LGPD.</p>
    </form>
  </Modal>
}



export function maskEmail(email) {
  const [local, domain] = email.split('@')
  return `${local.slice(0, 1)}***@${domain}`
}







export function LoginInline({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [recoverySuccess, setRecoverySuccess] = useState('')
  async function submit(event) { event.preventDefault(); setError(''); try { const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha: password }) }); const normalized = { ...result, perfil: Number(result.perfil ?? result.idPerfil ?? 4) }; storeUser(normalized); onLogin(normalized) } catch (e) { setError(e.message) } }
  if (recoveryOpen) return <PasswordRecoveryForm onCancel={() => setRecoveryOpen(false)} onSuccess={message => { setRecoveryOpen(false); setRecoverySuccess(message) }} />
  return <form className="form-stack" onSubmit={submit}><label>E-mail corporativo<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@inpetuhub.ufsc.br" /></label><label>Senha<PasswordInput required value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" /></label>{recoverySuccess && <p className="account-notice" role="status">{recoverySuccess}</p>}{error && <p className="form-message">{error}</p>}<Button type="submit" icon={ArrowRight}>Acessar painel</Button><p className="account-signup"><button type="button" onClick={() => { setRecoverySuccess(''); setRecoveryOpen(true) }}>Esqueci minha senha</button></p><p className="form-footnote icon-text"><ShieldCheck size={14} /> Acesso protegido por autenticação segura.</p></form>
}

export function PasswordRecoveryForm({ onCancel, onSuccess }) {
  const [step, setStep] = useState('email')
  const [form, setForm] = useState({ email: '', codigo: '', novaSenha: '', confirmarSenha: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    setError('')
    if (step === 'password' && form.novaSenha !== form.confirmarSenha) {
      setError('As senhas não coincidem.')
      return
    }
    setBusy(true)
    try {
      const body = step === 'email'
        ? { email: form.email }
        : step === 'code'
          ? { email: form.email, codigo: form.codigo }
          : { email: form.email, codigo: form.codigo, novaSenha: form.novaSenha }
      const path = step === 'email'
        ? '/auth/esqueci-senha'
        : step === 'code'
          ? '/auth/esqueci-senha/validar'
          : '/auth/esqueci-senha/redefinir'
      const result = await request(path, { method: 'POST', body: JSON.stringify(body) })
      if (step === 'email') {
        setStep('code')
        setMessage(result?.mensagem || 'Se o e-mail estiver associado a uma conta ativa, enviaremos um código de recuperação.')
      } else if (step === 'code') {
        setStep('password')
        setMessage('Código validado. Defina sua nova senha.')
      } else {
        onSuccess?.(result?.mensagem || 'Senha redefinida. Entre com sua nova senha.')
      }
    } catch (requestError) {
      setError(step === 'code' && requestError.status === 400
        ? 'Código inválido ou expirado. Confira os seis dígitos e tente novamente.'
        : requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return <form className="form-stack password-recovery-form" onSubmit={submit}>
    <p className="account-description">{step === 'email' ? 'Informe o e-mail da sua conta para receber um código de recuperação.' : step === 'code' ? `Digite o código de seis dígitos enviado para ${form.email}.` : 'Defina uma nova senha para sua conta.'}</p>
    {step === 'email' && <label>E-mail<input required type="email" autoComplete="email" maxLength={100} value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></label>}
    {step === 'code' && <label>Código de recuperação<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={form.codigo} onChange={event => setForm(current => ({ ...current, codigo: event.target.value.replace(/\D/g, '').slice(0, 6) }))} /></label>}
    {step === 'password' && <>
      <label>Nova senha<PasswordInput required minLength={8} maxLength={64} autoComplete="new-password" value={form.novaSenha} onChange={event => setForm(current => ({ ...current, novaSenha: event.target.value }))} /></label>
      <label>Confirmar nova senha<PasswordInput required minLength={8} maxLength={64} autoComplete="new-password" value={form.confirmarSenha} onChange={event => setForm(current => ({ ...current, confirmarSenha: event.target.value }))} /></label>
    </>}
    {message && <p className="account-notice" role="status">{message}</p>}
    {error && <p className="account-notice account-notice-error" role="alert">{error}</p>}
    <Button type="submit" disabled={busy}>{busy ? 'Aguarde...' : step === 'email' ? 'Enviar código' : step === 'code' ? 'Validar código' : 'Redefinir senha'}</Button>
    {step !== 'email' && <button type="button" className="text-button" onClick={() => { setStep(step === 'password' ? 'code' : 'email'); setError(''); setMessage('') }}>Voltar</button>}
    <button type="button" className="text-button" onClick={onCancel}>Voltar para o login</button>
  </form>
}
export function Kpi({ icon: Icon, label, value, change, accent }) { return <article className="kpi-card"><div className={`kpi-icon kpi-${accent}`}><Icon size={18} /></div><span className="kpi-label">{label}</span><strong className="kpi-value">{value}</strong><small>{change}</small><ArrowUpRight className="kpi-trend" size={16} /></article> }
export function CrmTitle({ title, description, action }) { return <div className="crm-title-row"><div><Title as="h1">{title}</Title><p>{description}</p></div>{action}</div> }
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
export function ClientProfileDialog({ client, reservations, tickets, auditItems, close, onSave, onPersona, onDeactivate, canDeactivate, canResetPassword, onResetPassword }) {
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
function Footer({ setView }) {
  return <footer className="site-footer"><div className="footer-main"><div><Logo variant="horizontalDark" /><p>Espaço para ideias. Conexões para transformar.</p></div><div className="footer-links"><span>EXPLORE</span><button onClick={() => setView('home')}>Espaços</button><button onClick={() => setView('calendar')}>Disponibilidade</button><button onClick={() => setView('help')}>Fale conosco</button></div><div className="footer-address"><span>ENCONTRE A GENTE</span><p className="icon-text"><MapPin size={15} /><span>Sapiens Parque · Lote 73<br />Rod. SC-401, 6001 · Florianópolis, SC</span></p><a className="icon-text" href="mailto:inpetu@contato.ufsc.br"><Mail size={15} /> inpetu@contato.ufsc.br</a><a className="icon-text" href="https://maps.google.com/?q=Sapiens+Parque+Florianopolis" target="_blank" rel="noreferrer">Abrir mapa <ExternalLink size={13} /></a></div></div><div className="footer-bottom"><span>© 2026 InPETU Hub · UFSC</span><span className="icon-text"><ShieldCheck size={14} /> Seus dados tratados com transparência, conforme a LGPD.</span><span>Ciência que aproxima. </span><nav className="footer-legal-links" aria-label="Informações legais"><a href="/termos">Termos de uso</a><a href="/privacidade">Política de privacidade</a></nav></div></footer>
}
function LegalNotice() {
  const [accepted, setAccepted] = useState(() => localStorage.getItem('inpetu-legal-notice-version') === LEGAL_NOTICE_VERSION)
  if (accepted) return null
  function accept() {
    localStorage.setItem('inpetu-legal-notice-version', LEGAL_NOTICE_VERSION)
    setAccepted(true)
  }
  return <aside className="legal-notice" aria-label="Aviso de termos e privacidade">
    <p>Ao usar o InPETU Connect, você declara que leu nossos <a href="/termos">Termos de Uso</a> e nossa <a href="/privacidade">Política de Privacidade</a>.</p>
    <button type="button" onClick={accept}>Entendi</button>
  </aside>
}
function LegalPage({ privacy = false, optionalPrivacySection: OptionalPrivacySection, optionalTermsSection: OptionalTermsSection }) {
  const privacyOffset = OptionalPrivacySection ? 1 : 0
  const title = privacy ? 'Política de Privacidade' : 'Termos de Uso'
  return <main className="legal-page">
    <article className="legal-document">
      <a href="/" className="legal-back-link">Voltar ao Início</a>
      <Title as="h1">{title}</Title>
      <p className="legal-review-warning">Documento informativo preliminar, sujeito à revisão jurídica antes da publicação oficial.</p>
      {privacy ? <>
        <h2>1. Dados tratados pelo sistema</h2>
        <ul>
          <li>Contas: nome completo, e-mail, telefone, cargo ou vínculo, organização, perfil e persona, estado da conta e data de cadastro. A senha é armazenada como hash; o sistema também registra se a senha é temporária e uma versão de token para invalidar sessões.</li>
          <li>Reservas: espaço, título e descrição do encontro, data, horários, quantidade de participantes quando aplicável, telefone para contato, estado do pedido e dados de análise, aprovação ou negociação, incluindo datas e identificadores da equipe responsável.</li>
          <li>Atendimento: e-mail, telefone opcional, mensagem e eventual anexo, estado do atendimento, resposta da equipe, datas de envio e resposta e identificador de quem atendeu.</li>
          <li>Arquivos enviados: foto de perfil (imagem processada e data de atualização), anexos de atendimento e, quando a equipe cadastra ou atualiza espaços e itens do ecossistema, imagens e logos com tipo de arquivo, nome, legenda e ordem de exibição.</li>
          <li>Notificações e e-mails: título, mensagem, tipo, data, estado de leitura e resultado do envio de e-mail; o endereço de e-mail do destinatário é usado para mensagens de confirmação, recuperação de senha, notificações e respostas de atendimento quando o envio está habilitado e configurado.</li>
          <li>Auditoria: data e hora, ação, tabela ou registro afetado, detalhes e identificador da conta responsável pela alteração.</li>
          <li>Segurança e sessão: cookie HttpOnly de autenticação e versão do token; o navegador também guarda em armazenamento local os dados básicos da conta usados para exibir a sessão. Para limitar tentativas e registrar eventos de cadastro, são mantidos hashes de e-mail e de endereço IP, não o IP em texto simples nesses registros.</li>
          <li>Recuperação de senha: e-mail, código de seis dígitos guardado como HMAC, validade e tentativas; senhas são guardadas como hash. Códigos de confirmação de cadastro também são guardados como hash.</li>
        </ul>
        {OptionalPrivacySection && <OptionalPrivacySection />}
        <h2>{2 + privacyOffset}. Finalidades e acesso</h2><p>Os dados descritos são usados para autenticar contas, administrar espaços e reservas, prestar atendimento, enviar as mensagens de serviço indicadas acima, exibir fotos e arquivos relacionados, registrar ações administrativas e proteger os fluxos de cadastro, sessão e recuperação de senha. O acesso às funções do sistema depende do perfil e das permissões da conta.</p>
        <h2>{3 + privacyOffset}. Direitos e contato</h2><p>Para exercer os direitos previstos na Lei nº 13.709/2018 (LGPD), solicitar informações ou esclarecer dúvidas, entre em contato pelo e-mail <a href="mailto:inpetu@contato.ufsc.br">inpetu@contato.ufsc.br</a>. Prazos de retenção, bases legais e procedimentos institucionais estão sujeitos à revisão jurídica.</p>
      </> : <>
        <h2>1. Uso do serviço</h2><p>O InPETU Connect permite consultar espaços, solicitar reservas, acompanhar solicitações e enviar mensagens. O acesso a funcionalidades depende do perfil e das permissões da conta.</p>
        <h2>2. Responsabilidades da pessoa usuária</h2><p>Informe dados corretos, mantenha suas credenciais protegidas e utilize o serviço de forma lícita. Não envie conteúdo de terceiros sem autorização nem conteúdo ilegal, ofensivo ou que viole direitos de outras pessoas.</p>
        <h2>3. Reservas</h2><p>Enviar uma solicitação não confirma automaticamente o uso do espaço. A equipe analisa o pedido, a disponibilidade e as regras aplicáveis; a situação pode ser acompanhada no sistema e a equipe pode entrar em contato pelos dados informados na solicitação.</p>
        {OptionalTermsSection && <OptionalTermsSection />}
        <h2>4. Alterações e contato</h2><p>O serviço e estes termos podem ser atualizados. Dúvidas podem ser encaminhadas a <a href="mailto:inpetu@contato.ufsc.br">inpetu@contato.ufsc.br</a>. Este documento é preliminar e deve ser validado juridicamente pela instituição.</p>
      </>}
    </article>
  </main>
}
function ReadingProgress() {
  const progress = useScrollProgress()
  return <div className="reading-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
}
function AppInner({ onCodeSent, onNavigate, initialView = 'default' }) {
  const [view, setCurrentView] = useState(() => initialView === 'default' ? getDefaultView() : initialView)
  useEffect(() => {
    setCurrentView(initialView === 'default' ? getDefaultView() : initialView)
  }, [initialView])
  function setView(nextView) {
    setCurrentView(nextView)
    const path = viewPaths[nextView] || optionalFeatureRoutes.find(route => route.view === nextView)?.path
    if (path) onNavigate(path)
  }
  const [spaces, setSpaces] = useState([])
  const [spacesLoaded, setSpacesLoaded] = useState(false)
  const [reservations, setReservations] = useState([])
  const [myReservations, setMyReservations] = useState([])
  const [myReservationsLoaded, setMyReservationsLoaded] = useState(false)
  const [dataError, setDataError] = useState('')
  const [runtimeConfig, setRuntimeConfig] = useState(null)
  const [runtimeConfigLoaded, setRuntimeConfigLoaded] = useState(false)
  const [runtimeConfigError, setRuntimeConfigError] = useState('')
  const enabledFeatureModules = optionalFeatureModules.filter(module => runtimeConfig?.[module.featureKey] === true)
  const optionalNavigation = enabledFeatureModules.flatMap(module => module.navigationItems || [])
  const optionalCrmExtensions = enabledFeatureModules.flatMap(module => module.crmExtensions || [])
  const requestedFeatureRoute = optionalFeatureRoutes.find(route => route.view === view)
  const activeFeature = enabledFeatureModules.find(module => module.routes?.some(route => route.view === view))
  const activeFeatureRoute = activeFeature?.routes.find(route => route.view === view)
  const ActiveFeaturePage = activeFeature?.PublicGallery
  const previewFeature = enabledFeatureModules.find(module => module.PublicGallery)
  const previewFeatureRoute = previewFeature?.routes?.[0]
  const OptionalPrivacySection = enabledFeatureModules.find(module => module.PrivacySection)?.PrivacySection
  const OptionalTermsSection = enabledFeatureModules.find(module => module.TermsSection)?.TermsSection
  const [bookingConfirmation, setBookingConfirmation] = useState('')
  const [bookingSpace, setBookingSpace] = useState(null)
  const [unavailableSpace, setUnavailableSpace] = useState(null)
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
  useEffect(() => {
    const handleSessionExpired = () => {
      clearStoredUser()
      setUser(null)
      setBookingSpace(null)
      setDataError(SESSION_EXPIRED_MESSAGE)
      setView('access')
    }
    window.addEventListener('inpetu-session-expired', handleSessionExpired)
    return () => window.removeEventListener('inpetu-session-expired', handleSessionExpired)
  }, [])
  function completeLogin(result) {
    const perfil = Number(result?.perfil ?? result?.idPerfil ?? 4)
    const nextUser = omitPersona({ ...result, perfil })
    const bookingDraft = readBookingDraft()
    storeUser(nextUser)
    setUser(nextUser)
    const crmUser = isCrmUser(nextUser)
    if (crmUser) sessionStorage.removeItem(BOOKING_DRAFT_KEY)
    if (bookingDraft && !crmUser) {
      setBookingSchedule({
        date: bookingDraft.form.dataReserva,
        time: bookingDraft.form.horarioInicio,
      })
      setBookingEndTime(bookingDraft.form.horarioFim)
      setBookingSpace(bookingDraft.space)
    }
    if (nextUser.senhaTemporaria) {
      setView('password-change')
      return
    }
    if (crmUser) {
      consumeLoginDestination()
      window.location.assign('/paineladm')
    } else {
      setView(consumeLoginDestination() || (bookingDraft ? 'calendar' : 'portal'))
    }
  }
  function openBooking(space, date = localDateValue(), time = '09:00', endTime = addMinutesToTime(time, 30)) {
    setBookingSchedule({ date, time })
    setBookingEndTime(endTime)
    setBookingSpace(space)
  }
  function showSpaceAvailability(space) {
    if (space?.ativo === false) {
      setUnavailableSpace(space)
      return
    }
    setUnavailableSpace(null)
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
      if (error.status === 401) return
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
    let active = true
    request('/config')
      .then(config => {
        if (!config || typeof config !== 'object' || Array.isArray(config) || Object.values(config).some(value => typeof value !== 'boolean')) {
          throw new Error('A API retornou uma configuração de funcionalidades inválida.')
        }
        if (active) setRuntimeConfig(config)
      })
      .catch(error => {
        if (active) {
          setRuntimeConfigError(error.message)
          setDataError(current => current || error.message)
        }
      })
      .finally(() => {
        if (active) setRuntimeConfigLoaded(true)
      })
    return () => { active = false }
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
        if (isCrmUser(normalized) && window.location.pathname.replace(/\/+$/, '') !== '/paineladm' && new URLSearchParams(window.location.search).get('legacyAdmin') !== '1') {
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
    setBookingConfirmation('Solicitação enviada. Acompanhe o andamento em Minhas reservas.')
    setView('reservations')
    window.scrollTo(0, 0)
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
    return <div className="public-app"><ReadingProgress /><Suspense fallback={<PageLoading />}><PasswordChangePage user={user} onLogout={logout} onPasswordChanged={passwordChanged} /></Suspense><LegalNotice /></div>
  }
  if (view === 'crm') return <><Suspense fallback={<p className="page-loading" role="status">Carregando painel da equipe...</p>}><Crm user={user} setUser={setUser} onReturnHome={() => { setView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} spaces={spaces} setSpaces={setSpaces} reservations={reservations} setReservations={setReservations} optionalExtensions={optionalCrmExtensions} /></Suspense><LegalNotice /></>
  return (
    <div className="public-app">
      <ReadingProgress />
      <Header view={view} setView={setView} openLogin={() => setView('access')} onOpenCalendar={openCalendar} user={user} onLogout={logout} onUserUpdate={updateCurrentUser} optionalNavigation={optionalNavigation} />
      {bookingConfirmation && <div className="booking-confirmation" role="status"><span className="booking-confirmation-icon" aria-hidden="true"><Check size={18} /></span><div><strong>Reserva enviada</strong><p>{bookingConfirmation}</p></div><button type="button" aria-label="Fechar confirmação" onClick={() => setBookingConfirmation('')}><X size={18} /></button></div>}
      {dataError && <p className="form-message api-error-banner" role="alert">{dataError}{dataError === SESSION_EXPIRED_MESSAGE ? '' : ' Atualize a página para tentar novamente.'}</p>}
      {view === 'home' && <main className="public-main"><Home spaces={spaces} spacesLoaded={spacesLoaded} onConsultSpace={showSpaceAvailability} setSignupOpen={() => setView('signup')} onOpenCalendar={openCalendar} user={user} optionalGallery={previewFeature?.PublicGallery} openOptionalFeature={() => previewFeatureRoute && setView(previewFeatureRoute.view)} openOptionalFeatureLogin={() => openLogin(previewFeatureRoute?.view)} onSearchAvailability={(date, kind) => { setCalendarQuery({ date, kind, spaceId: '' }); setView('calendar'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} /></main>}
      {activeFeatureRoute && <main className="public-main">{!runtimeConfigLoaded ? <p className="page-loading" role="status">Carregando configuração...</p> : runtimeConfigError ? <p className="form-message" role="alert">{runtimeConfigError}</p> : ActiveFeaturePage ? <ActiveFeaturePage API={API} request={request} Modal={Modal} Button={Button} ImageUploadField={ImageUploadField} Reveal={Reveal} Title={Title} user={user} onOpenLogin={() => openLogin(activeFeatureRoute.view)} /> : <section className="empty-inline" aria-labelledby="not-found-title"><strong id="not-found-title">Página não encontrada</strong><p>O endereço solicitado não está disponível.</p></section>}</main>}
      {requestedFeatureRoute && !activeFeatureRoute && <main className="public-main">{!runtimeConfigLoaded ? <p className="page-loading" role="status">Carregando configuração...</p> : runtimeConfigError ? <p className="form-message" role="alert">{runtimeConfigError}</p> : <section className="empty-inline" aria-labelledby="not-found-title"><strong id="not-found-title">Página não encontrada</strong><p>O endereço solicitado não está disponível.</p></section>}</main>}
      {view === 'portal' && user ? <Suspense fallback={<PageLoading />}><PortalHome user={user} items={myReservations} reservationsLoaded={myReservationsLoaded} onOpenCalendar={openCalendar} onOpenReservations={() => setView('reservations')} /></Suspense> : view === 'portal' && <Suspense fallback={<PageLoading />}><AccessPage onLogin={completeLogin} onSignup={() => setView('signup')} onForgotPassword={() => setView('help')} /></Suspense>}
      {view === 'calendar' && <Reveal key={view} className="route-reveal"><Suspense fallback={<p className="page-loading" role="status">Carregando calendário...</p>}><CalendarPage spaces={spaces} spacesLoaded={spacesLoaded} onReserve={openBooking} initialDate={calendarQuery.date || localDateValue()} initialKind={calendarQuery.kind} initialSpaceId={calendarQuery.spaceId} availabilityVersion={availabilityVersion} /></Suspense></Reveal>}
      {view === 'reservations' && user ? <Reveal key={view} className="route-reveal"><Suspense fallback={<PageLoading />}><ReservationsPage items={myReservations} onCancel={updateCancel} /></Suspense></Reveal> : view === 'reservations' && <Reveal key={view} className="route-reveal"><Suspense fallback={<PageLoading />}><AccessPage onLogin={completeLogin} onSignup={() => setView('signup')} onForgotPassword={() => setView('help')} /></Suspense></Reveal>}
      {view === 'help' && <Reveal key={view} className="route-reveal"><Suspense fallback={<PageLoading />}><HelpPage /></Suspense></Reveal>}
      {(view === 'terms' || view === 'privacy') && <LegalPage privacy={view === 'privacy'} optionalPrivacySection={OptionalPrivacySection} optionalTermsSection={OptionalTermsSection} />}
      {view === 'access' && <Reveal key={view} className="route-reveal"><Suspense fallback={<PageLoading />}><AccessPage onLogin={completeLogin} onSignup={() => setView('signup')} onForgotPassword={() => setView('help')} /></Suspense></Reveal>}
      {view === 'signup' && <Reveal key={view} className="route-reveal"><Suspense fallback={<PageLoading />}><SignupPage onBack={() => setView('access')} onCodeSent={onCodeSent} /></Suspense></Reveal>}
      {!['access', 'signup'].includes(view) && <Footer setView={setView} />}
      <LegalNotice />
      <Modal open={Boolean(unavailableSpace)} close={() => setUnavailableSpace(null)} title="Espaço indisponível">
        <div className="unavailable-reason-modal"><strong>{unavailableSpace?.nomeEspaco}</strong><p>{unavailableSpace?.motivoIndisponibilidade || 'Este espaço está temporariamente indisponível.'}</p>{unavailableSpace?.dataPrevisaoRetorno && <small>{unavailableDeadlineLabel(unavailableSpace.dataPrevisaoRetorno)}</small>}</div>
        <Button onClick={() => setUnavailableSpace(null)}>Fechar</Button>
      </Modal>
      <BookingModal space={bookingSpace} close={() => setBookingSpace(null)} onSaved={updateSaved} openLogin={() => openLogin('calendar')} initialDate={bookingSchedule.date} initialTime={bookingSchedule.time} initialEndTime={bookingEndTime} user={user} />
    </div>
  )
}

export default function App() {
  const readLocation = () => {
    const params = new URLSearchParams(window.location.search)
    const requestedView = params.get('view')
    const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
    const routeView = routeViews[pathname] || optionalFeatureRoutes.find(route => route.path === pathname)?.view
    return {
      pathname,
      view: params.get('legacyAdmin') === '1'
        ? 'crm'
        : routeView || (pathname === '/'
          ? ['home', 'portal', 'reservations', 'calendar', 'signup', 'access', 'help', 'terms', 'privacy', 'password-change', ...optionalFeatureRoutes.map(route => route.view)].includes(requestedView) ? requestedView : 'default'
          : 'not-found'),
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
    return <Suspense fallback={<PageLoading />}><EmailConfirmationPage /></Suspense>
  }
  if (location.pathname === '/verificar-email') {
    return <Suspense fallback={<PageLoading />}><EmailVerificationPage
      email={sessionStorage.getItem('inpetu-code-email') || ''}
      onCorrectEmail={() => navigate('/?view=signup', true)}
      onConfirmed={() => navigate('/', true)}
    /></Suspense>
  }
  if (location.view === 'not-found') {
    return <main className="public-app public-main">
      <section className="empty-inline" aria-labelledby="not-found-title">
        <h1 id="not-found-title">Página não encontrada</h1>
        <p>O endereço solicitado não está disponível.</p>
        <a className="button button-primary" href="/">Voltar ao início</a>
      </section>
    </main>
  }
  return <AppInner initialView={location.view} onNavigate={navigate} onCodeSent={email => {
    sessionStorage.setItem('inpetu-code-email', email)
    sessionStorage.setItem('inpetu-code-sent-at', String(Date.now()))
    navigate('/verificar-email')
  }} />
}
