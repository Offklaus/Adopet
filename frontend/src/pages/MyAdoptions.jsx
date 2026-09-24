import { Link } from 'react-router-dom'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { Badge, Button, Icon } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { listMyAdoptionRequests } from '../services/adoptionsService'

// O que cada situação significa para quem pediu a adoção.
const STATUS = {
  received: {
    tone: 'primary',
    label: 'Recebido',
    text: 'A ONG vai entrar em contato por e-mail em até 3 dias úteis para agendar a visita.'
  },
  approved: {
    tone: 'success',
    label: 'Aprovado',
    text: 'Seu pedido foi aprovado! A ONG vai combinar com você os próximos passos.'
  },
  rejected: {
    tone: 'danger',
    label: 'Não aprovado',
    text: 'Desta vez não deu certo. Há outros pets esperando por uma família.'
  }
}
const HOUSING = {
  'casa-quintal': 'Casa com quintal',
  casa: 'Casa sem quintal',
  apartamento: 'Apartamento'
}
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' })

function MyRequestCard({ request }) {
  const status = STATUS[request.status] ?? STATUS.received
  return (
    <li className="request-card">
      <div className="my-request__top">
        <Link to={`/pets/${request.petId}`} className="my-request__thumb" aria-hidden="true" tabIndex={-1}>
          {request.petPhoto ? <img src={request.petPhoto} alt="" loading="lazy" /> : <Icon name="paw" size={28} />}
        </Link>
        <div className="stack" style={{ gap: 4, minWidth: 0 }}>
          <p className="request-card__pet">
            <Link to={`/pets/${request.petId}`}>{request.petName}</Link>
            <Badge tone={status.tone}>{status.label}</Badge>
          </p>
          <p className="t-body-sm t-muted" style={{ margin: 0 }}>Pedido feito em {dateFormat.format(new Date(request.createdAt))}</p>
        </div>
      </div>

      <p style={{ margin: 0 }}>{status.text}</p>

      <dl className="request-card__data">
        <div><dt>Contato informado</dt><dd>{request.email}</dd></div>
        <div><dt>Cidade</dt><dd>{request.city}</dd></div>
        <div><dt>Moradia</dt><dd>{HOUSING[request.housing] ?? request.housing}</dd></div>
      </dl>

      {request.message && <p className="request-card__message">{request.message}</p>}
    </li>
  )
}

/** Pedidos de adoção feitos pela conta logada. */
export default function MyAdoptions() {
  const { user, loading: authLoading } = useAuth()
  const requests = useAsync(() => (user ? listMyAdoptionRequests() : Promise.resolve(null)), [user?.id])

  if (authLoading) return <LoadingState />

  if (!user) {
    return (
      <section className="section section--tight">
        <div className="form-card auth-card">
          <h1 className="t-heading-lg">Meus pedidos</h1>
          <p className="t-muted" style={{ margin: 0 }}>Entre na sua conta para ver os pedidos de adoção que você fez.</p>
          <div className="row">
            <Button to="/entrar?voltar=%2Fmeus-pedidos">Entrar</Button>
            <Button variant="outline" to="/entrar?modo=cadastro&voltar=%2Fmeus-pedidos">Criar conta</Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section section--tight">
      <div className="container stack" style={{ gap: 24 }}>
        <div className="section__head" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="t-display-lg">Meus pedidos</h1>
            {requests.data && <p className="t-muted">{requests.data.length} pedido(s) de adoção</p>}
          </div>
          <Button variant="outline" to="/adotar">Ver pets para adoção</Button>
        </div>

        {requests.loading && <LoadingState label="Buscando seus pedidos…" />}
        {requests.error && <ErrorState error={requests.error} onRetry={requests.reload} />}

        {requests.data?.length === 0 && (
          <div className="state">
            <Icon name="heart" size={32} />
            <p>Você ainda não fez nenhum pedido de adoção.</p>
            <Button to="/adotar">Conhecer os pets</Button>
          </div>
        )}

        {requests.data?.length > 0 && (
          <ul className="request-list">
            {requests.data.map((request) => <MyRequestCard key={request.id} request={request} />)}
          </ul>
        )}

        <p className="t-body-sm t-muted" style={{ margin: 0 }}>
          Aparecem aqui os pedidos feitos enquanto você estava conectado a esta conta.
        </p>
      </div>
    </section>
  )
}
