import { useParams } from 'react-router-dom'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { Alert, Badge, Button, Icon } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { getPet } from '../services/petsService'
import NotFound from './NotFound'

export default function PetProfile() {
  const { id } = useParams()
  const { data: pet, loading, error, reload } = useAsync(() => getPet(id), [id])
  const { user } = useAuth()

  if (loading) return <LoadingState />
  if (error?.status === 404) return <NotFound />
  if (error) {
    return (
      <section className="section section--tight">
        <div className="container"><ErrorState error={error} onRetry={reload} /></div>
      </section>
    )
  }

  const adopted = pet.status === 'adopted'
  const reserved = pet.status === 'reserved'

  return (
    <section className="section section--tight">
      <div className="container stack" style={{ gap: 24 }}>
        <div>
          <Button variant="ghost" to="/adotar" icon="arrow-left">Voltar para a lista</Button>
        </div>

        <div className="profile">
          <div className="profile__photo">
            {pet.photo ? (
              <img src={pet.photo} alt={pet.photoAlt || `Foto de ${pet.name}`} />
            ) : (
              <Icon name="paw" size={120} />
            )}
          </div>

          <div className="profile__info">
            <h1 className="t-display-lg">{pet.name}</h1>
            <p className="t-body-lg t-muted">{[pet.age, pet.sex, pet.size].filter(Boolean).join(' · ')}</p>
            <p className="ap-pet__loc"><Icon name="pin" size={16} />{[pet.neighborhood, pet.location].filter(Boolean).join(', ')}</p>
            <div className="row">
              {pet.tags.map((tag) => <Badge key={tag} tone="secondary">{tag}</Badge>)}
            </div>

            <div>
              <h2 className="t-heading-sm">História</h2>
              <p className="t-body-lg" style={{ marginTop: 8 }}>{pet.story}</p>
            </div>

            {adopted && <Alert tone="success" title={`${pet.name} já encontrou um lar`}>Veja outros pets que ainda esperam por uma família.</Alert>}
            {reserved && <Alert tone="warning" title="Adoção em andamento">Já existe um pedido em análise para {pet.name}, mas você ainda pode enviar o seu.</Alert>}

            {!adopted && (
              <div className="stack" style={{ gap: 8 }}>
                <div className="row">
                  <Button size="lg" to={`/pets/${pet.id}/adotar`}>Quero adotar</Button>
                  <Button size="lg" variant="secondary" icon="calendar" to={`/pets/${pet.id}/adotar?visita=1`}>Agendar visita</Button>
                </div>
                {!user && (
                  <p className="t-body-sm t-muted" style={{ margin: 0 }}>
                    Para pedir a adoção é preciso entrar na sua conta.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
