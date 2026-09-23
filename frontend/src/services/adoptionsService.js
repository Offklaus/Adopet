import { request } from './api'

/**
 * Envia um pedido de adoção.
 * Corpo: { petId, name, email, phone, city, housing, hasOtherPets, message, agreeVisit }
 */
export async function createAdoptionRequest(data) {
  return request('/adoptions', { method: 'POST', body: data })
}
