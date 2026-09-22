import { ErrorState } from '../feedback/ErrorState'
import { LoadingState } from '../feedback/LoadingState'
import { Icon } from '../ui'
import { PetCard } from './PetCard'

/** Grid de pets com estados de carregamento, erro e lista vazia. */
export function PetGrid({ pets, loading, error, onRetry, emptyMessage = 'Nenhum pet encontrado com esses filtros.' }) {
  if (loading) return <LoadingState label="Buscando pets…" />
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (!pets?.length) {
    return (
      <div className="state">
        <Icon name="search" size={32} />
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="pet-grid">
      {pets.map((pet) => (
        <PetCard key={pet.id} {...pet} to={`/pets/${pet.id}`} />
      ))}
    </div>
  )
}
