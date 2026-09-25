import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AdminNav } from '../components/admin/AdminNav'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { Alert, Badge, Button, Icon, TextField } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { listPets } from '../services/petsService'

const SPECIES_LABEL = { cao: 'Cão', gato: 'Gato' }
const STATUS_BADGE = {
  available: { tone: 'secondary', label: 'Disponível' },
  reserved: { tone: 'warning', label: 'Em processo' },
  adopted: { tone: 'success', label: 'Adotado' }
}

/** Lista de administração: todos os animais cadastrados, com acesso à edição. */
export default function AdminPets() {
  const pets = useAsync(() => listPets(), [])
  const [query, setQuery] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  // Aviso vindo da página de edição depois de excluir um animal.
  const [deletedName] = useState(location.state?.deletedName)

  // Limpa o aviso do histórico para ele não voltar ao recarregar a página.
  useEffect(() => {
    if (location.state?.deletedName) navigate(location.pathname, { replace: true, state: null })
  }, [location, navigate])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return pets.data ?? []
    return (pets.data ?? []).filter((pet) => `${pet.name} ${pet.city}`.toLowerCase().includes(term))
  }, [pets.data, query])

  return (
    <section className="section section--tight">
      <div className="container stack" style={{ gap: 24 }}>
        <AdminNav />
        <div className="section__head" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="t-display-lg">Animais cadastrados</h1>
            {pets.data && <p className="t-muted">{pets.data.length} no banco de dados</p>}
          </div>
          <Button to="/admin/animais/novo" icon="paw">Cadastrar animal</Button>
        </div>

        {deletedName && (
          <Alert tone="success" title={`${deletedName} foi excluído`}>Ele não aparece mais no site.</Alert>
        )}

        <TextField
          label="Filtrar por nome ou cidade"
          icon="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {pets.loading && <LoadingState label="Buscando animais…" />}
        {pets.error && <ErrorState error={pets.error} onRetry={pets.reload} />}

        {pets.data && filtered.length === 0 && (
          <div className="state">
            <Icon name="search" size={32} />
            <p>{pets.data.length === 0 ? 'Nenhum animal cadastrado ainda.' : 'Nenhum animal com esse nome ou cidade.'}</p>
          </div>
        )}

        {filtered.length > 0 && (
          <ul className="admin-list">
            {filtered.map((pet) => {
              const badge = STATUS_BADGE[pet.status]
              return (
                <li key={pet.id} className="admin-row">
                  <div className="admin-row__thumb" aria-hidden="true">
                    {pet.photo ? <img src={pet.photo} alt="" loading="lazy" /> : <Icon name="paw" size={28} />}
                  </div>
                  <div className="admin-row__info">
                    <p className="admin-row__name">
                      {pet.name}
                      {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
                    </p>
                    <p className="t-body-sm t-muted">
                      {[SPECIES_LABEL[pet.species], pet.sex, pet.size, pet.age, pet.location].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="admin-row__actions">
                    <Button variant="ghost" size="sm" to={`/pets/${pet.id}`}>Ver</Button>
                    <Button variant="outline" size="sm" to={`/admin/animais/${pet.id}/editar`} aria-label={`Editar ${pet.name}`}>
                      Editar
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
