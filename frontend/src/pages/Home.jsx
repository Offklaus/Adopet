import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DonationCard } from '../components/donations/DonationCard'
import { PetGrid } from '../components/pets/PetGrid'
import { Button, Chip, Hero, Stepper, TextField } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { listCampaigns } from '../services/campaignsService'
import { listPets } from '../services/petsService'

const HOW_IT_WORKS = ['Escolha um pet', 'Envie o pedido', 'Agende a visita', 'Leve para casa']

// Manchete no ritmo dos posts: linhas curtas, alternando branco e limão.
const HEADLINE = ['Amor', { text: 'adotado,', accent: true }, 'amor', { text: 'redobrado.', accent: true }]

export default function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const pets = useAsync(() => listPets(), [])
  const campaigns = useAsync(() => listCampaigns(), [])

  const featured = (pets.data ?? []).filter((pet) => pet.status !== 'adopted').slice(0, 3)
  // A foto do Hero é a do primeiro pet em destaque que tiver foto; sem nenhuma, o Hero mostra a pata.
  const heroPet = featured.find((pet) => pet.photo)
  const campaign = campaigns.data?.[0]

  function handleSearch(event) {
    event.preventDefault()
    const q = query.trim()
    navigate(q ? `/adotar?q=${encodeURIComponent(q)}` : '/adotar')
  }

  return (
    <>
      <div className="container home-hero">
        <Hero
          label="Adote um pet"
          eyebrow="Adoção responsável"
          title={HEADLINE}
          subtitle={
            <>
              Um novo <strong>lar</strong>, uma nova <strong>vida</strong>. Todos os nossos pets são vacinados e
              castrados antes da adoção.
            </>
          }
          actions={
            <>
              <Button variant="secondary" size="lg" to="/adotar" iconRight="arrow-right">Quero adotar</Button>
              <Button variant="donate" size="lg" icon="heart" to="/doar">Doar</Button>
            </>
          }
          image={heroPet?.photo}
          imageAlt={heroPet ? heroPet.photoAlt || `Foto de ${heroPet.name}` : ''}
        />

        <div className="search-band">
          <form className="search-form" onSubmit={handleSearch} role="search">
            <TextField
              label="Buscar por nome ou cidade"
              icon="search"
              placeholder="Ex.: Thor, São Paulo"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button type="submit" size="lg">Buscar</Button>
          </form>
          <div className="row">
            <Chip onClick={() => navigate('/adotar?especie=cao')}>Cães</Chip>
            <Chip onClick={() => navigate('/adotar?especie=gato')}>Gatos</Chip>
          </div>
        </div>
      </div>

      <section className="section section--tight">
        <div className="container">
          <div className="section__head">
            <div>
              <h2 className="t-heading-lg">Conheça quem espera por você</h2>
              <p className="t-muted">Pets que chegaram ao abrigo recentemente.</p>
            </div>
            <Button variant="ghost" to="/adotar" iconRight="arrow-right">Ver todos</Button>
          </div>
          <PetGrid pets={featured} loading={pets.loading} error={pets.error} onRetry={pets.reload} />
        </div>
      </section>

      <section id="como-funciona" className="section section--sunken">
        <div className="container">
          <div className="how">
            <h2 className="t-heading-lg">Como funciona</h2>
            <p className="t-body-lg t-muted" style={{ marginTop: 8 }}>
              Você escolhe o pet, conta um pouco sobre sua casa e a ONG agenda uma visita. Sem custo de adoção.
            </p>
          </div>
          <div style={{ marginTop: 48 }}>
            <Stepper steps={HOW_IT_WORKS} current={-1} />
          </div>
        </div>
      </section>

      {campaign && (
        <section className="section">
          <div className="container split">
            <div className="stack">
              <h2 className="t-heading-lg">Não pode adotar agora?</h2>
              <p className="t-body-lg t-muted">
                Sua doação paga ração, vacinas e castração para os pets que ainda esperam. Cada real vai direto para o abrigo.
              </p>
              <div>
                <Button variant="ghost" to="/doar" iconRight="arrow-right">Ver todas as campanhas</Button>
              </div>
            </div>
            <DonationCard
              {...campaign}
              onDonate={(amount) => navigate(`/doar?campanha=${campaign.id}&valor=${amount}`)}
            />
          </div>
        </section>
      )}
    </>
  )
}
