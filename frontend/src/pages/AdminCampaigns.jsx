import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AdminNav } from '../components/admin/AdminNav'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { Alert, Badge, Button, Chip, Icon, ProgressBar } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { listAllCampaigns } from '../services/campaignsService'
import { formatBRL } from '../utils/formatBRL'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

// Avisos vindos das páginas de criação e edição (state do navigate).
const NOTICES = {
  created: (title) => ({ title: `Campanha "${title}" criada`, text: 'Ela já aparece na página Doar e recebe doações.' }),
  updated: (title) => ({ title: `Campanha "${title}" atualizada`, text: 'As mudanças já aparecem na página Doar.' }),
  ended: (title) => ({
    title: `Campanha "${title}" encerrada`,
    text: 'Ela saiu da página Doar e não recebe novas doações. As pendentes ainda podem ser marcadas como pagas.'
  })
}

/** Campanhas: as ativas (as da página Doar), com edição, e as encerradas. */
export default function AdminCampaigns() {
  const campaigns = useAsync(() => listAllCampaigns(), [])
  const location = useLocation()
  const navigate = useNavigate()
  const [notice] = useState(() => {
    const { notice: kind, title } = location.state ?? {}
    return NOTICES[kind]?.(title) ?? null
  })
  const [show, setShow] = useState('active') // 'active' | 'ended'

  // Limpa o aviso do histórico para ele não voltar ao recarregar a página.
  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null })
  }, [location, navigate])

  const all = campaigns.data ?? []
  const active = all.filter((campaign) => campaign.active)
  const ended = all.filter((campaign) => !campaign.active)
  const shown = show === 'active' ? active : ended

  return (
    <section className="section section--tight">
      <div className="container stack" style={{ gap: 24 }}>
        <AdminNav />
        <div className="section__head" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="t-display-lg">Campanhas</h1>
            {campaigns.data && <p className="t-muted">{active.length} ativa(s) na página Doar · {ended.length} encerrada(s)</p>}
          </div>
          <Button to="/admin/campanhas/nova" icon="gift">Nova campanha</Button>
        </div>

        {notice && <Alert tone="success" title={notice.title}>{notice.text}</Alert>}

        {campaigns.loading && <LoadingState label="Buscando campanhas…" />}
        {campaigns.error && <ErrorState error={campaigns.error} onRetry={campaigns.reload} />}

        {campaigns.data && (
          <div className="row" role="group" aria-label="Situação da campanha">
            <Chip selected={show === 'active'} onClick={() => setShow('active')}>Ativas ({active.length})</Chip>
            <Chip selected={show === 'ended'} onClick={() => setShow('ended')}>Encerradas ({ended.length})</Chip>
          </div>
        )}

        {campaigns.data && shown.length === 0 && (
          <div className="state">
            <Icon name="gift" size={32} />
            <p>{show === 'active' ? 'Nenhuma campanha ativa. Crie a primeira.' : 'Nenhuma campanha encerrada.'}</p>
          </div>
        )}

        {shown.length > 0 && (
          <ul className="admin-list">
            {shown.map((campaign) => (
              <li key={campaign.id} className="admin-row">
                <div className="admin-row__thumb" aria-hidden="true">
                  <Icon name="gift" size={28} />
                </div>
                <div className="admin-row__info">
                  <p className="admin-row__name">
                    {campaign.title}
                    {campaign.active
                      ? campaign.tag && <Badge tone="donate">{campaign.tag}</Badge>
                      : (
                        <Badge tone="neutral">
                          Encerrada{campaign.endedAt && ` em ${dateFormat.format(new Date(campaign.endedAt))}`}
                        </Badge>
                      )}
                  </p>
                  <p className="t-body-sm t-muted">{campaign.description}</p>
                  <ProgressBar value={campaign.raised} max={campaign.goal} label={`Meta de ${campaign.title}`} />
                  <p className="t-body-sm t-muted">
                    {formatBRL(campaign.raised)} arrecadados de {formatBRL(campaign.goal)} · {campaign.supporters} apoiador(es)
                  </p>
                </div>
                {campaign.active && (
                  <div className="admin-row__actions">
                    <Button
                      variant="outline"
                      size="sm"
                      to={`/admin/campanhas/${campaign.id}/editar`}
                      aria-label={`Editar ou encerrar ${campaign.title}`}
                    >
                      Editar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
