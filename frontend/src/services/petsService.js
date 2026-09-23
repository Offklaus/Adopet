import { request } from './api'

/** Lista pets do banco. Filtros: { species: 'cao' | 'gato', q: nome ou cidade }. */
export async function listPets({ species, q } = {}) {
  const params = new URLSearchParams()
  if (species) params.set('species', species)
  if (q) params.set('q', q)
  const query = params.toString()
  return request(`/pets${query ? `?${query}` : ''}`)
}

export async function getPet(id) {
  return request(`/pets/${encodeURIComponent(id)}`)
}
