import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, Filter, Mail, MapPin, MessageCircle, Plus, ShieldCheck } from 'lucide-react'
import { Avatar, Button, Logo, Modal, PasswordInput, PasswordRecoveryForm, PhoneInput, Title, calendarDaysUntil, formatBrazilianPhone, localDateValue, maskEmail, request, reservationStatusClass, reservationStatusLabel, storeUser, uploadQuestion } from './App.jsx'
import { CountUp, Reveal, Stagger, StaggerItem } from './motion/index.js'

export function AccessPage({ onLogin, onSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [recoverySuccess, setRecoverySuccess] = useState('')
  const [recoveryOpen, setRecoveryOpen] = useState(false)
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
    <div className="account-brand"><Logo variant="institutionalLight" className="account-brand-logo-light" /><Logo variant="institutionalDark" className="account-brand-logo-dark" /></div><div className="account-page-heading"><Title as="h1">Acesso ao InPETU Connect</Title><p>Entre com seu e-mail e senha para acessar sua conta.</p></div>
    <section className="account-card" aria-label="Acessar sua conta">
      <p className="account-description">Acesse para acompanhar e gerenciar suas solicitações. O painel da equipe é exibido conforme as permissões da sua conta.</p>
      {recoveryOpen
        ? <PasswordRecoveryForm onCancel={() => setRecoveryOpen(false)} onSuccess={message => { setRecoveryOpen(false); setRecoverySuccess(message) }} />
        : <>
          <form className="form-stack account-form" onSubmit={submit}>
            <label>E-mail <span aria-hidden="true">*</span><input required type="email" autoComplete="email" placeholder="seu.email@empresa.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
            <label>Senha <span aria-hidden="true">*</span><PasswordInput required autoComplete="current-password" placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)} /></label>
            {recoverySuccess && <p className="account-notice" role="status">{recoverySuccess}</p>}
            {notice && <p className="account-notice account-notice-error" role="alert">{notice}</p>}
            <Button type="submit" disabled={busy}>{busy ? 'Aguarde...' : 'Entrar com e-mail e senha'}</Button>
          </form>
          <p className="account-signup"><button type="button" onClick={() => { setNotice(''); setRecoverySuccess(''); setRecoveryOpen(true) }}>Esqueci minha senha</button></p>
        </>}
      <p className="account-signup">Ainda não tem cadastro? <button type="button" onClick={onSignup}>Cadastre-se aqui</button></p>
      <p className="account-security"><ShieldCheck size={14} /> Acesso à equipe restrito a colaboradores autorizados.</p>
    </section>
  </main>
}

export function SignupPage({ onBack, onCodeSent }) {
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
    <div className="account-brand"><Logo variant="institutionalLight" className="account-brand-logo-light" /><Logo variant="institutionalDark" className="account-brand-logo-dark" /></div><div className="account-page-heading"><Title as="h1">Criar acesso público</Title><p>Cadastre-se para solicitar espaços e acompanhar seus agendamentos.</p></div>
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
        <Button type="submit" icon={ArrowRight}>Criar conta</Button>
      </form>
      <p className="account-signup"><button type="button" onClick={onBack}>Voltar para o acesso</button></p>
    </section>
  </main>
}

export function PasswordChangePage({ user, onLogout, onPasswordChanged }) {
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

export function EmailVerificationPage({ email, onCorrectEmail, onConfirmed }) {
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
    <div className="account-brand"><Logo variant="institutionalLight" className="account-brand-logo-light" /><Logo variant="institutionalDark" className="account-brand-logo-dark" /></div><div className="account-page-heading"><Title as="h1">Verifique seu e-mail</Title><p>Digite o código de 6 dígitos enviado para {email ? <strong>{maskEmail(email)}</strong> : 'seu endereço de e-mail'}.</p></div>
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

export function EmailConfirmationPage() {
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
    <div className="account-brand"><Logo variant="institutionalLight" className="account-brand-logo-light" /><Logo variant="institutionalDark" className="account-brand-logo-dark" /></div><div className="account-page-heading"><Title as="h1">Confirmação de cadastro</Title><p>Validação do seu acesso ao InPETU Connect.</p></div>
    <section className="account-card" aria-live="polite">
      <p className={`account-notice ${status.kind === 'success' ? 'account-notice-success' : status.kind === 'error' ? 'account-notice-error' : ''}`} role={status.kind === 'error' ? 'alert' : 'status'}>{status.message}</p>
      {status.kind !== 'loading' && <p className="account-signup"><a href="/">Voltar ao InPETU Connect</a></p>}
    </section>
  </main>
}

export function ReservationsPage({ items, onCancel }) {
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

export function PortalHome({ user, items, reservationsLoaded, onOpenCalendar, onOpenReservations }) {
  const activeThisMonth = items.filter(item => ['Pendente', 'Confirmada'].includes(item.statusReserva)
    && item.dataReserva?.slice(0, 7) === localDateValue().slice(0, 7)).length
  const upcoming = items
    .filter(item => ['Pendente', 'Confirmada'].includes(item.statusReserva)
      && new Date(`${item.dataReserva}T${item.horarioInicio || '00:00'}`) >= new Date())
    .sort((a, b) => `${a.dataReserva}T${a.horarioInicio}`.localeCompare(`${b.dataReserva}T${b.horarioInicio}`))
    .slice(0, 3)
  return <main className="inner-page portal-home">
    <Reveal as="section" className="portal-welcome">
      <div><Title as="h1">Olá, <em>{user?.nome?.split(' ')[0] || 'bem-vindo'}</em></Title><p>Acompanhe suas reservas e planeje o próximo encontro no InPETU Hub.</p></div>
      <Avatar user={user} tamanho={64} className="portal-avatar" />
    </Reveal>
    <Stagger as="section" className="portal-summary-grid" aria-label="Resumo da conta">
      <StaggerItem as="article" className="portal-summary-card"><span>RESERVAS ATIVAS · ESTE MÊS</span><strong><CountUp value={activeThisMonth} /></strong><small>Solicitações pendentes ou confirmadas neste mês</small></StaggerItem>
      <StaggerItem as="article" className="portal-summary-card"><span>PRÓXIMAS RESERVAS</span><strong>{reservationsLoaded ? <CountUp value={upcoming.length} /> : '...'}</strong><small>Solicitações pendentes ou confirmadas</small></StaggerItem>
    </Stagger>
    <Reveal as="section" className="portal-upcoming">
      <div className="portal-section-heading"><div><Title as="h2">Próximas reservas</Title></div><button type="button" className="portal-text-action" onClick={onOpenReservations}>Minhas reservas <ArrowRight size={15} /></button></div>
      {!reservationsLoaded ? <p className="portal-empty">Carregando suas reservas...</p> : upcoming.length ? <Stagger as="div" className="portal-upcoming-list">{upcoming.map(item => <StaggerItem as="article" key={item.idReserva}><span className="portal-date"><strong>{new Date(`${item.dataReserva}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit' })}</strong><small>{new Date(`${item.dataReserva}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></span><div><strong>{item.tituloEvento}</strong><small>{item.dataReserva} · {item.horarioInicio}-{item.horarioFim} · {item.espaco || 'Espaço InPETU'}{item.telefoneContato ? ` · Contato: ${formatBrazilianPhone(item.telefoneContato)}` : ''}</small></div><span className={`status-pill ${reservationStatusClass(item.statusReserva)}`}><i />{reservationStatusLabel(item.statusReserva)}</span></StaggerItem>)}</Stagger> : <p className="portal-empty">Você ainda não tem reservas próximas. Que tal planejar seu próximo encontro?</p>}
      <Button icon={CalendarDays} onClick={onOpenCalendar}>Agendar espaço</Button>
    </Reveal>
  </main>
}

export function HelpPage() {
  const [form, setForm] = useState({ emailContato: '', telefoneContato: '', mensagemDuvida: '' })
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  async function submit(event) { event.preventDefault(); setStatus(''); if (file && (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type) || file.size > 10 * 1024 * 1024)) return setStatus('Anexe PDF, PNG ou JPG de até 10 MB.'); try { if (file) await uploadQuestion(form, file, setProgress); else await request('/duvidas', { method: 'POST', body: JSON.stringify(form) }); setProgress(100); setStatus('Mensagem enviada. A equipe InPETU responderá pelo e-mail informado.'); setForm({ emailContato: '', telefoneContato: '', mensagemDuvida: '' }); setFile(null) } catch (error) { setStatus(error.message); setProgress(0) } }
  return <main className="inner-page help-page"><div className="help-intro"><Title as="h1">Vamos conversar<br /><em>sobre sua ideia?</em></Title><p>Tem dúvidas sobre os espaços, eventos ou quer descobrir como fazer parte do ecossistema? Escreva para a gente.</p><div className="help-contact"><span><Mail size={17} /></span><div><small>FALE DIRETAMENTE</small><strong>inpetu@contato.ufsc.br</strong></div></div><div className="help-contact"><span><MapPin size={17} /></span><div><small>VENHA NOS VISITAR</small><strong>Lote 73 · Sapiens Parque, Florianópolis</strong></div></div></div><form className="help-form" onSubmit={submit}><div className="form-heading"><MessageCircle size={20} /><div><strong>Fale com a equipe</strong><small>Retornamos em até dois dias úteis.</small></div></div><label>Seu e-mail<input required type="email" value={form.emailContato} onChange={e => setForm({ ...form, emailContato: e.target.value })} /></label><label>Telefone <span>(opcional)</span><PhoneInput value={form.telefoneContato} onChange={telefoneContato => setForm({ ...form, telefoneContato })} /></label><label>Sua mensagem<textarea required rows="5" maxLength="5000" value={form.mensagemDuvida} onChange={e => setForm({ ...form, mensagemDuvida: e.target.value })} placeholder="Como podemos ajudar?" /></label><label className="upload-box"><input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={e => setFile(e.target.files?.[0] || null)} /><span className="upload-icon"><Plus size={19} /></span><span><strong>{file ? file.name : 'Adicionar anexo'}</strong><small>PDF, PNG ou JPG · até 10 MB</small></span><span className="upload-action">Escolher arquivo</span></label>{progress > 0 && <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>}{status && <p className={status.startsWith('Mensagem') ? 'success-note' : 'form-message'}>{status}</p>}<Button type="submit">Enviar mensagem <ArrowRight size={16} /></Button><p className="form-footnote"><ShieldCheck size={14} /> Seus dados são protegidos pela política de privacidade UFSC.</p></form></main>
}
