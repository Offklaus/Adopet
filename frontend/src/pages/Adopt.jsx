import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PetGrid } from '../components/pets/PetGrid'
import { Button, Chip, TextField } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { listPets } from '../services/petsService'

const SPECIES = [
  { value: '', label: 'Todos' },
  { value: 'cao', label: 'Cães' },
  { value: 'gato', label: 'Gatos' }
]

export default function Adopt() {
  const [searchParams, setSearchParams] = useSearchParams()
  const species = searchParams.get('especie') ?? ''
  const q = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(q)

  useEffect(() => setQuery(q), [q])

  const pets = useAsync(() => listPets({ species, q }), [species, q])

  function updateParams(changes) {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    setSearchParams(next)
  }

  function handleSearch(event) {
    event.preventDefault()
    updateParams({ q: query.trim() })
  }

  return (
    <section className="section section--tight">
      <div className="container stack" style={{ gap: 32 }}>
        <div className="stack">
          <h1 className="t-display-lg">Pets para adoção</h1>
          <p className="t-body-lg t-muted">Todos vacinados, castrados e esperando por uma família.</p>
        </div>

        <div className="stack">
          <form className="hero__search" onSubmit={handleSearch} role="search">
            <TextField
              label="Buscar por nome ou cidade"
              icon="search"
              placeholder="Ex.: Mel, Campinas"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button type="submit" size="lg">Buscar</Button>
          </form>
          <div className="row" role="group" aria-label="Espécie">
            {SPECIES.map((option) => (
              <Chip
                key={option.value}
                selected={species === option.value}
                onClick={() => updateParams({ especie: option.value })}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </div>

        <PetGrid pets={pets.data} loading={pets.loading} error={pets.error} onRetry={pets.reload} />
      </div>
    </section>
  )
}
