import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminKeyField } from '../components/admin/AdminKeyField'
import { LoadingState } from '../components/feedback/LoadingState'
import { Alert, Badge, Button, Chip, Icon, TextField } from '../components/ui'
import { useAdminKey } from '../hooks/useAdminKey'
import { listAdoptionRequests } from '../services/adoptionsService'

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

function RequestCard({ request }) {
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
                {filtered.map((request) => <RequestCard key={request.id} request={request} />)}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  )
}
