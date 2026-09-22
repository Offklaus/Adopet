import { HttpError } from '../../lib/http.js'
import { createPetsRepository } from './petsRepository.js'

const SPECIES = ['cao', 'gato']

export function registerPetsRoutes(router, db) {
  const pets = createPetsRepository(db)

  // GET /api/pets?species=cao|gato&q=texto
  router.get('/api/pets', ({ query }) => {
    const species = query.get('species') || undefined
    const q = query.get('q')?.trim().slice(0, 100) || undefined
    if (species && !SPECIES.includes(species)) {
      throw new HttpError(400, 'Espécie inválida. Use "cao" ou "gato".')
    }
    return { status: 200, body: pets.list({ species, q }) }
  })

  router.get('/api/pets/:id', ({ params }) => {
    const pet = pets.findById(params.id)
    if (!pet) throw new HttpError(404, 'Pet não encontrado.')
    return { status: 200, body: pet }
  })
}
