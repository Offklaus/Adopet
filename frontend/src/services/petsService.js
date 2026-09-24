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

/** Cadastra um animal (administração). `adminKey` é a ADMIN_API_KEY do backend. */
export async function createPet(data, adminKey) {
  return request('/pets', {
    method: 'POST',
    body: data,
    headers: { Authorization: `Bearer ${adminKey}` }
  })
}

/** Exclui um animal (administração). A API recusa (409) se ele tiver pedidos de adoção. */
export async function deletePet(id, adminKey) {
  return request(`/pets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminKey}` }
  })
}

/** Edita um animal (administração). Envia o cadastro completo, como no createPet. */
export async function updatePet(id, data, adminKey) {
  return request(`/pets/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: data,
    headers: { Authorization: `Bearer ${adminKey}` }
  })
}
