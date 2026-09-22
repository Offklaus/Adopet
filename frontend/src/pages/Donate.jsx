import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DonationCard } from '../components/donations/DonationCard'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { Alert } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { createDonation, listCampaigns } from '../services/campaignsService'
import { formatBRL } from '../utils/formatBRL'

export default function Donate() {
  const [searchParams] = useSearchParams()
  const preselectedCampaign = searchParams.get('campanha')
  const preselectedAmount = Number(searchParams.get('valor')) || undefined

  const campaigns = useAsync(() => listCampaigns(), [])
  const [feedback, setFeedback] = useState(null)

  async function handleDonate(campaign, amount) {
    setFeedback(null)
    try {
      await createDonation({ campaignId: campaign?.id ?? null, amount })
      setFeedback({
        tone: 'success',
        title: 'Obrigado por ajudar',
        text: `Registramos sua doação de ${formatBRL(amount)}${campaign ? ` para "${campaign.title}"` : ''}. Em breve você poderá concluir o pagamento por Pix ou cartão.`
      })
    } catch {
      setFeedback({ tone: 'danger', title: 'Não foi possível registrar', text: 'Tente de novo em alguns instantes.' })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="section section--tight">
      <div className="container stack" style={{ gap: 32 }}>
        <div className="stack">
          <h1 className="t-display-lg">Doe para quem ainda espera</h1>
          <p className="t-body-lg t-muted">Escolha uma campanha ou faça uma doação livre para o abrigo.</p>
        </div>

        {feedback && <Alert tone={feedback.tone} title={feedback.title}>{feedback.text}</Alert>}

        {campaigns.loading && <LoadingState label="Buscando campanhas…" />}
        {campaigns.error && <ErrorState error={campaigns.error} onRetry={campaigns.reload} />}

        {campaigns.data && (
          <div className="donate-grid">
            {campaigns.data.map((campaign) => (
              <DonationCard
                key={campaign.id}
                {...campaign}
                defaultAmount={campaign.id === preselectedCampaign ? preselectedAmount : undefined}
                onDonate={(amount) => handleDonate(campaign, amount)}
              />
            ))}
            <DonationCard
              title="Doação livre"
              description="Vai para onde o abrigo mais precisa no momento: ração, remédios ou transporte."
              amounts={[30, 60, 120, 250]}
              onDonate={(amount) => handleDonate(null, amount)}
            />
          </div>
        )}
      </div>
    </section>
  )
}
