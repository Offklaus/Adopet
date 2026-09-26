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

// Administração: a API confere a sessão (cookie) do administrador logado.

/** Cadastra um animal. */
export async function createPet(data) {
  return request('/pets', { method: 'POST', body: data })
}

/**
 * Envia a foto de um animal (JPG, PNG ou WebP, até 5 MB).
 * Resposta: { id, url }; a url ("/api/photos/<id>") vai no campo photo do cadastro.
 */
export async function uploadPetPhoto(file) {
  return request('/photos', { method: 'POST', body: file })
}

/** Exclui um animal. A API recusa (409) se ele tiver pedidos de adoção. */
export async function deletePet(id) {
  return request(`/pets/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** Edita um animal. Envia o cadastro completo, como no createPet. */
export async function updatePet(id, data) {
  return request(`/pets/${encodeURIComponent(id)}`, { method: 'PUT', body: data })
}
