import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminKeyField } from '../components/admin/AdminKeyField'
import { LoadingState } from '../components/feedback/LoadingState'
import { Alert, Badge, Button, Chip, Icon, TextField } from '../components/ui'
import { useAdminKey } from '../hooks/useAdminKey'
import { decideAdoptionRequest, listAdoptionRequests } from '../services/adoptionsService'

const STATUS = {
  received: { tone: 'primary', label: 'Recebido' },
  approved: { tone: 'success', label: 'Aprovado' },
  rejected: { tone: 'danger', label: 'Recusado' }
}
const FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'received', label: 'Recebidos' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'rejected', label: 'Recusados' }
]
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

function RequestCard({ request, otherOpen, onDecide }) {
  const status = STATUS[request.status]
  return (
    <li className="request-card">
      <div className="request-card__head">
        <div>
          <p className="request-card__pet">
            <Link to={`/pets/${request.petId}`}>{request.petName}</Link>
            {status && <Badge tone={status.tone}>{status.label}</Badge>}
          </p>
          <p className="t-body-sm t-muted">Recebido em {dateFormat.format(new Date(request.createdAt))}</p>
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

      {request.status === 'received' && (
        <DecisionActions request={request} otherOpen={otherOpen} onDecide={onDecide} />
      )}
    </li>
  )
}

/** Pedidos de adoção (administração). Os dados pessoais só são carregados com a chave. */
export default function AdminAdoptions() {
  const { adminKey, setAdminKey, remember, setRemember, persist } = useAdminKey()
  const [requests, setRequests] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [keyError, setKeyError] = useState()
  const [statusFilter, setStatusFilter] = useState('')
  const [query, setQuery] = useState('')
  // Resultado da última decisão (aprovar/recusar).
  const [notice, setNotice] = useState(null)

  async function load(key) {
    if (!key.trim()) {
      setKeyError('Informe a chave de administrador.')
      return
    }
    setLoading(true)
    setError(null)
    setKeyError(undefined)
    try {
      setRequests(await listAdoptionRequests(key.trim()))
      persist()
    } catch (err) {
      setRequests(null)
      if (err.status === 401) {
        setKeyError('Chave de administrador inválida.')
        setError({ title: 'Chave recusada', text: 'Confira o valor de ADMIN_API_KEY no backend/.env.' })
      } else {
        setError({ title: 'Não foi possível carregar os pedidos', text: err.message })
      }
    } finally {
      setLoading(false)
    }
  }

  /** Aprova ou recusa e recarrega a lista. Devolve true se deu certo. */
  async function handleDecide(request, status) {
    setNotice(null)
    try {
      const result = await decideAdoptionRequest(request.id, status, adminKey.trim())
      const details = []
      if (result.autoRejected > 0) {
        details.push(`${result.autoRejected} outro(s) pedido(s) para ${result.pet.name} foram recusados.`)
      }
      if (status === 'rejected' && result.pet.status === 'available') {
        details.push(`${result.pet.name} voltou a aparecer como disponível para adoção.`)
      }
      setNotice({
        tone: 'success',
        title: status === 'approved'
          ? `Pedido aprovado: ${result.pet.name} foi adotado por ${request.name}`
          : `Pedido de ${request.name} recusado`,
        text: details.join(' ')
      })
      await load(adminKey)
      return true
    } catch (err) {
      if (err.status === 401) {
        setKeyError('Chave de administrador inválida.')
        setNotice({ tone: 'danger', title: 'Chave recusada', text: 'Confira o valor de ADMIN_API_KEY no backend/.env.' })
      } else if (err.status === 409) {
        // Alguém já decidiu este pedido: mostra a situação atual.
        setNotice({ tone: 'warning', title: err.message, text: 'A lista foi atualizada.' })
        await load(adminKey)
      } else {
        setNotice({ tone: 'danger', title: 'Não foi possível salvar a decisão', text: err.message })
      }
      return false
    } finally {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Com a chave lembrada nesta aba, a lista abre direto.
  useEffect(() => {
    if (adminKey) load(adminKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const counts = useMemo(() => {
    const result = { '': requests?.length ?? 0 }
    for (const request of requests ?? []) result[request.status] = (result[request.status] ?? 0) + 1
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
      if (statusFilter && request.status !== statusFilter) return false
      if (!term) return true
      return `${request.petName} ${request.name} ${request.email} ${request.city}`.toLowerCase().includes(term)
    })
  }, [requests, statusFilter, query])

  return (
    <section className="section section--tight">
      <div className="container stack" style={{ gap: 24 }}>
        <div className="section__head" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="t-display-lg">Pedidos de adoção</h1>
            {requests && <p className="t-muted">{requests.length} pedido(s) no banco de dados</p>}
          </div>
          <div className="row">
            {requests && (
              <Button variant="ghost" onClick={() => load(adminKey)} disabled={loading}>Atualizar</Button>
            )}
            <Button variant="outline" to="/admin/animais">Animais cadastrados</Button>
          </div>
        </div>

        {error && <Alert tone="danger" title={error.title}>{error.text}</Alert>}
        {notice && <Alert tone={notice.tone} title={notice.title}>{notice.text || null}</Alert>}

        {!requests && (
          <form
            className="admin-key-card"
            onSubmit={(event) => {
              event.preventDefault()
              load(adminKey)
            }}
          >
            <p className="t-muted" style={{ margin: 0 }}>
              Os pedidos têm nome, e-mail e telefone de quem quer adotar. Informe a chave para ver.
            </p>
            <AdminKeyField
              adminKey={adminKey}
              setAdminKey={setAdminKey}
              remember={remember}
              setRemember={setRemember}
              error={keyError}
            />
            <div>
              <Button type="submit" disabled={loading}>{loading ? 'Carregando…' : 'Ver pedidos'}</Button>
            </div>
          </form>
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
