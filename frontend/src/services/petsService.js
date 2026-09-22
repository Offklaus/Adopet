import { mockPets } from '../data/mockPets'
import { ApiError, USE_MOCKS, mockDelay, request } from './api'

/** Lista pets. Filtros: { species: 'cao' | 'gato', q: texto livre }. */
export async function listPets({ species, q } = {}) {
  if (USE_MOCKS) {
    const term = q?.trim().toLowerCase()
    const result = mockPets.filter((pet) => {
      if (species && pet.species !== species) return false
      if (term && !`${pet.name} ${pet.location}`.toLowerCase().includes(term)) return false
      return true
    })
    return mockDelay(result)
  }

  const params = new URLSearchParams()
  if (species) params.set('species', species)
  if (q) params.set('q', q)
  const query = params.toString()
  return request(`/pets${query ? `?${query}` : ''}`)
}

export async function getPet(id) {
  if (USE_MOCKS) {
    const pet = mockPets.find((item) => item.id === id)
    if (!pet) throw new ApiError('Pet não encontrado.', 404)
    return mockDelay(pet)
  }
  return request(`/pets/${encodeURIComponent(id)}`)
}
