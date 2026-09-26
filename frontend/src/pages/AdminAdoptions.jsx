import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminNav } from '../components/admin/AdminNav'
import { LoadingState } from '../components/feedback/LoadingState'
import { Alert, Badge, Button, Chip, Icon, TextField } from '../components/ui'
import {
  decideAdoptionRequest,
  listAdoptionRequests,
  markAdoptionNotified,
  unmarkAdoptionNotified
} from '../services/adoptionsService'
import { adoptionDecisionLink } from '../utils/whatsapp'

const STATUS = {
  received: { tone: 'primary', label: 'Recebido' },
  approved: { tone: 'success', label: 'Aprovado' },
  rejected: { tone: 'danger', label: 'Recusado' }
}
const FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'received', label: 'Recebidos' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'rejected', label: 'Recusados' },
  // Aprovados ou recusados cujo adotante ainda não foi avisado.
  { value: 'to-notify', label: 'Falta avisar' }
]

const needsNotice = (request) => request.status !== 'received' && !request.notifiedAt
const HOUSING = {
  'casa-quintal': 'Casa com quintal',
  casa: 'Casa sem quintal',
  apartamento: 'Apartamento'
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

/** "11912345678" → "(11) 91234-5678". */
function formatPhone(digits) {
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return digits
}

/**
 * Botões de decisão de um pedido recebido, com confirmação.
 * `otherOpen` = outros pedidos em aberto para o mesmo pet (serão recusados se este for aprovado).
 */
function DecisionActions({ request, otherOpen, onDecide }) {
  const [confirming, setConfirming] = useState(null) // null | 'approved' | 'rejected'
  const [sending, setSending] = useState(false)

  async function confirm() {
    setSending(true)
    const done = await onDecide(request, confirming)
    // Se deu erro, o card continua na tela: volta aos botões.
    if (!done) {
      setSending(false)
      setConfirming(null)
    }
  }

  if (!confirming) {
    return (
      <div className="request-card__actions">
        <Button variant="danger" size="sm" icon="x" onClick={() => setConfirming('rejected')}>Recusar</Button>
        <Button size="sm" icon="check" onClick={() => setConfirming('approved')}>Aprovar</Button>
      </div>
    )
  }

  const approving = confirming === 'approved'
  return (
    <div className="request-card__confirm" role="group" aria-label={approving ? 'Confirmar aprovação' : 'Confirmar recusa'}>
      <p>
        {approving ? (
          <>
            Aprovar o pedido de <strong>{request.name}</strong>? {request.petName} vai aparecer como adotado no site
            {otherOpen > 0 && ` e ${otherOpen === 1 ? 'o outro pedido' : `os outros ${otherOpen} pedidos`} para ele ${otherOpen === 1 ? 'será recusado' : 'serão recusados'}`}.
          </>
        ) : (
          <>Recusar o pedido de <strong>{request.name}</strong> para {request.petName}?</>
        )}
      </p>
      <div className="request-card__actions">
        <Button variant="ghost" size="sm" onClick={() => setConfirming(null)} disabled={sending}>Cancelar</Button>
        <Button variant={approving ? 'primary' : 'danger'} size="sm" onClick={confirm} disabled={sending}>
          {sending ? 'Salvando…' : approving ? 'Confirmar aprovação' : 'Confirmar recusa'}
        </Button>
      </div>
    </div>
  )
}

/**
 * Abre o WhatsApp do administrador na conversa com quem pediu, com a mensagem da decisão já escrita
 * (aprovado ou recusado). O envio é feito por ele, no WhatsApp.
 */
function WhatsAppButton({ request, size = 'sm', onNotified }) {
  const again = Boolean(request.notifiedAt)
  return (
    <Button
      variant="outline"
      size={size}
      icon="chat"
      href={adoptionDecisionLink(request)}
      target="_blank"
      rel="noopener noreferrer"
      // Abrir o WhatsApp com a mensagem já marca o pedido como avisado (dá para desmarcar).
      onClick={() => onNotified(request, true)}
      aria-label={`${again ? 'Avisar de novo' : 'Avisar'} ${request.name} no WhatsApp (abre em outra aba)`}
    >
      {again ? 'Avisar de novo' : 'Avisar no WhatsApp'}
    </Button>
  )
}

/** Situação do aviso de um pedido decidido: "Avisado em …" (com Desmarcar) ou "Falta avisar". */
function NoticeStatus({ request, onNotified }) {
  if (!request.notifiedAt) return <Badge tone="warning" icon="alert">Falta avisar</Badge>
  return (
    <span className="row">
      <Badge tone="success" icon="check">Avisado em {dateFormat.format(new Date(request.notifiedAt))}</Badge>
      <Button variant="ghost" size="sm" onClick={() => onNotified(request, false)}>Desmarcar</Button>
    </span>
  )
}

function RequestCard({ request, otherOpen, onDecide, onNotified }) {
  const status = STATUS[request.status]
  return (
    <li className="request-card">
      <div className="request-card__head">
        <div className="request-card__top">
          {/* Mesmo link do nome: fica fora da navegação por teclado e do leitor de tela. */}
          <Link to={`/pets/${request.petId}`} className="request-card__thumb" aria-hidden="true" tabIndex={-1}>
            {request.petPhoto ? <img src={request.petPhoto} alt="" loading="lazy" /> : <Icon name="paw" size={28} />}
          </Link>
          <div>
            <p className="request-card__pet">
              <Link to={`/pets/${request.petId}`}>{request.petName}</Link>
              {status && <Badge tone={status.tone}>{status.label}</Badge>}
            </p>
            <p className="t-body-sm t-muted">Recebido em {dateFormat.format(new Date(request.createdAt))}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" to={`/admin/animais/${request.petId}/editar`}>Editar animal</Button>
      </div>

      <dl className="request-card__data">
        <div><dt>Nome</dt><dd>{request.name}</dd></div>
        <div><dt>E-mail</dt><dd><a href={`mailto:${request.email}`}>{request.email}</a></dd></div>
        <div><dt>Telefone</dt><dd><a href={`tel:+55${request.phone}`}>{formatPhone(request.phone)}</a></dd></div>
        <div><dt>Cidade</dt><dd>{request.city}</dd></div>
        <div><dt>Moradia</dt><dd>{HOUSING[request.housing] ?? request.housing}</dd></div>
        <div><dt>Outros pets</dt><dd>{request.hasOtherPets ? 'Sim' : 'Não'}</dd></div>
      </dl>

      {request.message && <p className="request-card__message">{request.message}</p>}

      {request.status === 'received' ? (
        <DecisionActions request={request} otherOpen={otherOpen} onDecide={onDecide} />
      ) : (
        <div className="request-card__notice">
          <NoticeStatus request={request} onNotified={onNotified} />
          <WhatsAppButton request={request} onNotified={onNotified} />
        </div>
      )}
    </li>
  )
}

/** 401 = sessão terminou; 403 = conta sem permissão de administrador. */
function sessionProblem(err) {
  if (err.status === 401) return { title: 'Sua sessão terminou', text: 'Entre de novo com a conta de administrador.' }
  if (err.status === 403) return { title: 'Acesso restrito', text: 'Esta área é só para administradores.' }
  return null
}

/** Pedidos de adoção (administração). Só o administrador logado chega aqui (RequireAdmin). */
export default function AdminAdoptions() {
  const [requests, setRequests] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [query, setQuery] = useState('')
  // Resultado da última decisão (aprovar/recusar).
  const [notice, setNotice] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setRequests(await listAdoptionRequests())
    } catch (err) {
      setRequests(null)
      setError(sessionProblem(err) ?? { title: 'Não foi possível carregar os pedidos', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  /** Aprova ou recusa e recarrega a lista. Devolve true se deu certo. */
  async function handleDecide(request, status) {
    setNotice(null)
    try {
      const result = await decideAdoptionRequest(request.id, status)
      const details = []
      if (result.autoRejected > 0) {
        details.push(
          `${result.autoRejected} outro(s) pedido(s) para ${result.pet.name} foram recusados; ` +
          'cada um tem o botão "Avisar no WhatsApp" na lista.'
        )
      }
      if (status === 'rejected' && result.pet.status === 'available') {
        details.push(`${result.pet.name} voltou a aparecer como disponível para adoção.`)
      }
      setNotice({
        tone: 'success',
        title: status === 'approved'
          ? `Pedido aprovado: ${result.pet.name} foi adotado por ${request.name}`
          : `Pedido de ${request.name} recusado`,
        text: details.join(' '),
        // O pedido já com a decisão: o aviso oferece mandar a mensagem para esta pessoa.
        decided: { ...request, status }
      })
      await load()
      return true
    } catch (err) {
      if (sessionProblem(err)) {
        setNotice({ tone: 'danger', ...sessionProblem(err) })
      } else if (err.status === 409) {
        // Alguém já decidiu este pedido: mostra a situação atual.
        setNotice({ tone: 'warning', title: err.message, text: 'A lista foi atualizada.' })
        await load()
      } else {
        setNotice({ tone: 'danger', title: 'Não foi possível salvar a decisão', text: err.message })
      }
      return false
    } finally {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  /** Marca (on) ou desmarca o aviso e atualiza só aquele pedido na lista. */
  async function handleNotified(request, on) {
    try {
      const updated = on ? await markAdoptionNotified(request.id) : await unmarkAdoptionNotified(request.id)
      setRequests((current) =>
        current?.map((item) => (item.id === updated.id ? { ...item, notifiedAt: updated.notifiedAt } : item))
      )
    } catch (err) {
      setNotice(
        sessionProblem(err)
          ? { tone: 'danger', ...sessionProblem(err) }
          : { tone: 'danger', title: 'Não foi possível registrar o aviso', text: err.message }
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    load()
  }, [])

  const counts = useMemo(() => {
    const result = { '': requests?.length ?? 0 }
    for (const request of requests ?? []) {
      result[request.status] = (result[request.status] ?? 0) + 1
      if (needsNotice(request)) result['to-notify'] = (result['to-notify'] ?? 0) + 1
    }
    return result
  }, [requests])

  // Pedidos em aberto por pet, para avisar quantos serão recusados ao aprovar um deles.
  const openByPet = useMemo(() => {
    const result = {}
    for (const request of requests ?? []) {
      if (request.status === 'received') result[request.petId] = (result[request.petId] ?? 0) + 1
    }
    return result
  }, [requests])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (requests ?? []).filter((request) => {
      if (statusFilter === 'to-notify') {
        if (!needsNotice(request)) return false
      } else if (statusFilter && request.status !== statusFilter) return false
      if (!term) return true
      return `${request.petName} ${request.name} ${request.email} ${request.city}`.toLowerCase().includes(term)
    })
  }, [requests, statusFilter, query])

  return (
    <section className="section section--tight">
      <div className="container stack" style={{ gap: 24 }}>
        <AdminNav />
        <div className="section__head" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="t-display-lg">Pedidos de adoção</h1>
            {requests && <p className="t-muted">{requests.length} pedido(s) no banco de dados</p>}
          </div>
          {requests && (
            <Button variant="ghost" onClick={() => load()} disabled={loading}>Atualizar</Button>
          )}
        </div>

        {error && <Alert tone="danger" title={error.title}>{error.text}</Alert>}
        {notice && (
          <div className="stack" style={{ gap: 8 }}>
            <Alert tone={notice.tone} title={notice.title}>{notice.text || null}</Alert>
            {notice.decided && (() => {
              // O pedido como está na lista agora (com o aviso marcado, se já foi).
              const decided = requests?.find((item) => item.id === notice.decided.id) ?? notice.decided
              return (
                <div className="row">
                  <WhatsAppButton request={decided} size="md" onNotified={handleNotified} />
                  <span className="t-body-sm t-muted">
                    {decided.notifiedAt
                      ? `Marcado como avisado em ${dateFormat.format(new Date(decided.notifiedAt))}.`
                      : `Abre o seu WhatsApp com a mensagem pronta para ${decided.name}.`}
                  </span>
                </div>
              )
            })()}
          </div>
        )}

        {loading && !requests && <LoadingState label="Buscando pedidos…" />}

        {requests && (
          <>
            <div className="row" role="group" aria-label="Situação do pedido">
              {FILTERS.map((filter) => (
                <Chip key={filter.value} selected={statusFilter === filter.value} onClick={() => setStatusFilter(filter.value)}>
                  {filter.label} ({counts[filter.value] ?? 0})
                </Chip>
              ))}
            </div>
            <TextField
              label="Buscar por animal, pessoa, e-mail ou cidade"
              icon="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            {filtered.length === 0 ? (
              <div className="state">
                <Icon name="search" size={32} />
                <p>{requests.length === 0 ? 'Nenhum pedido de adoção ainda.' : 'Nenhum pedido com esses filtros.'}</p>
              </div>
            ) : (
              <ul className="request-list">
                {filtered.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    otherOpen={(openByPet[request.petId] ?? 1) - 1}
                    onDecide={handleDecide}
                    onNotified={handleNotified}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  )
}
