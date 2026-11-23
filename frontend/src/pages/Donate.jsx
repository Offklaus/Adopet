import { DonationCard } from '../components/donations/DonationCard'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { Button, Icon } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { listCampaigns } from '../services/campaignsService'

/** Campanhas ativas. Doar = abrir o WhatsApp da ONG com a mensagem pronta (o site não recebe dinheiro). */
export default function Donate() {
  const campaigns = useAsync(() => listCampaigns(), [])

  return (
    <section className="section section--tight">
      <div className="container stack" style={{ gap: 32 }}>
        <div className="stack">
          <h1 className="t-display-lg">Doe para quem ainda espera</h1>
          <p className="t-body-lg t-muted">
            Escolha a campanha e o valor. O botão abre o WhatsApp da ONG com a mensagem pronta, e vocês combinam o
            pagamento direto, sem passar pelo site.
          </p>
        </div>

        {campaigns.loading && <LoadingState label="Buscando campanhas…" />}
        {campaigns.error && <ErrorState error={campaigns.error} onRetry={campaigns.reload} />}

        {campaigns.data?.length === 0 && (
          <div className="state">
            <Icon name="gift" size={32} />
            <p>Nenhuma campanha aberta no momento.</p>
            <Button variant="outline" to="/adotar">Conhecer os pets</Button>
          </div>
        )}

        {campaigns.data?.length > 0 && (
          <div className="donate-grid">
            {campaigns.data.map((campaign) => (
              <DonationCard key={campaign.id} {...campaign} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
