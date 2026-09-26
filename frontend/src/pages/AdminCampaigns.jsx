import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AdminNav } from '../components/admin/AdminNav'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { Alert, Badge, Button, Icon, ProgressBar } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { listCampaigns } from '../services/campaignsService'
import { formatBRL } from '../utils/formatBRL'

/** Campanhas ativas (as que aparecem na página Doar), com acesso à criação. */
export default function AdminCampaigns() {
  const campaigns = useAsync(() => listCampaigns(), [])
  const location = useLocation()
  const navigate = useNavigate()
  // Aviso vindo da página de criação.
  const [created] = useState(location.state?.createdTitle)

  // Limpa o aviso do histórico para ele não voltar ao recarregar a página.
  useEffect(() => {
    if (location.state?.createdTitle) navigate(location.pathname, { replace: true, state: null })
  }, [location, navigate])

  return (
    <section className="section section--tight">
      <div className="container stack" style={{ gap: 24 }}>
        <AdminNav />
        <div className="section__head" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="t-display-lg">Campanhas</h1>
            {campaigns.data && <p className="t-muted">{campaigns.data.length} ativa(s) na página Doar</p>}
          </div>
          <Button to="/admin/campanhas/nova" icon="gift">Nova campanha</Button>
        </div>

        {created && (
          <Alert tone="success" title={`Campanha "${created}" criada`}>
            Ela já aparece na página Doar e recebe doações.
          </Alert>
        )}

        {campaigns.loading && <LoadingState label="Buscando campanhas…" />}
        {campaigns.error && <ErrorState error={campaigns.error} onRetry={campaigns.reload} />}

        {campaigns.data?.length === 0 && (
          <div className="state">
            <Icon name="gift" size={32} />
            <p>Nenhuma campanha ativa. Crie a primeira.</p>
          </div>
        )}

        {campaigns.data?.length > 0 && (
          <ul className="admin-list">
            {campaigns.data.map((campaign) => (
              <li key={campaign.id} className="admin-row">
                <div className="admin-row__thumb" aria-hidden="true">
                  <Icon name="gift" size={28} />
                </div>
                <div className="admin-row__info">
                  <p className="admin-row__name">
                    {campaign.title}
                    {campaign.tag && <Badge tone="donate">{campaign.tag}</Badge>}
                  </p>
                  <p className="t-body-sm t-muted">{campaign.description}</p>
                  <ProgressBar value={campaign.raised} max={campaign.goal} label={`Meta de ${campaign.title}`} />
                  <p className="t-body-sm t-muted">
                    {formatBRL(campaign.raised)} arrecadados de {formatBRL(campaign.goal)} · {campaign.supporters} apoiador(es)
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
