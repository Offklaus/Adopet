import { request } from './api'

/**
 * Envia um pedido de adoção.
 * Corpo: { petId, name, email, phone, city, housing, hasOtherPets, message, agreeVisit }
 */
export async function createAdoptionRequest(data) {
  return request('/adoptions', { method: 'POST', body: data })
}

/** Lista os pedidos de adoção (administração: têm dados pessoais e exigem a ADMIN_API_KEY). */
export async function listAdoptionRequests(adminKey) {
  return request('/adoptions', { headers: { Authorization: `Bearer ${adminKey}` } })
}
