import { useNavigate, useParams } from 'react-router-dom'
import { CampaignForm } from '../components/campaigns/CampaignForm'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { Alert, Button } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { endCampaign, getCampaign, updateCampaign } from '../services/campaignsService'
import { formatBRL } from '../utils/formatBRL'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

/** Edição e encerramento de uma campanha (administração). */
export default function CampaignEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const campaign = useAsync(() => getCampaign(id), [id])
  const back = (notice, title) => navigate('/admin/campanhas', { state: { notice, title } })

  if (campaign.loading) {
    return <section className="section section--tight"><LoadingState label="Buscando campanha…" /></section>
  }
  if (campaign.error) {
    return (
      <section className="section section--tight">
        <div className="container"><ErrorState error={campaign.error} onRetry={campaign.reload} /></div>
      </section>
    )
  }

  const data = campaign.data
  // Encerrada não se edita: mostra o resumo e o caminho de volta.
  if (!data.active) {
    return (
      <section className="section section--tight">
        <div className="form-card">
          <div>
            <Button variant="ghost" to="/admin/campanhas" icon="arrow-left">Voltar para as campanhas</Button>
          </div>
          <h1 className="t-heading-lg">{data.title}</h1>
          <Alert tone="info" title={`Campanha encerrada${data.endedAt ? ` em ${dateFormat.format(new Date(data.endedAt))}` : ''}`}>
            Arrecadou {formatBRL(data.raised)} de {formatBRL(data.goal)}, com {data.supporters} apoiador(es).
            Campanhas encerradas não podem ser editadas.
          </Alert>
        </div>
      </section>
    )
  }

  return (
    <CampaignForm
      key={data.id}
      title={`Editar ${data.title}`}
      intro={`Arrecadado até agora: ${formatBRL(data.raised)}, de ${data.supporters} apoiador(es). Esses números não mudam na edição.`}
      initialCampaign={data}
      submitLabel="Salvar alterações"
      sendingLabel="Salvando…"
      onSubmit={(payload) => updateCampaign(data.id, payload)}
      onSaved={(saved) => back('updated', saved.title)}
      onEnd={async () => {
        const ended = await endCampaign(data.id)
        back('ended', ended.title)
      }}
    />
  )
}
