import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { PetForm } from '../components/pets/PetForm'
import { useAsync } from '../hooks/useAsync'
import { deletePet, getPet, updatePet } from '../services/petsService'
import NotFound from './NotFound'

export default function PetEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pet = useAsync(() => getPet(id), [id])

  if (pet.loading) return <LoadingState />
  if (pet.error?.status === 404) return <NotFound />
  if (pet.error) {
    return (
      <section className="section section--tight">
        <div className="container"><ErrorState error={pet.error} onRetry={pet.reload} /></div>
      </section>
    )
  }

  return (
    <PetForm
      // Recria o formulário se trocar de animal sem sair da página.
      key={pet.data.id}
      title={`Editar ${pet.data.name}`}
      backTo="/admin/animais"
      initialPet={pet.data}
      submitLabel="Salvar alterações"
      sendingLabel="Salvando…"
      resetLabel="Desfazer alterações"
      onSubmit={(payload) => updatePet(id, payload)}
      successTitle={() => 'Alterações salvas'}
      onDelete={async () => {
        await deletePet(id)
        navigate('/admin/animais', { state: { deletedName: pet.data.name } })
      }}
    />
  )
}
