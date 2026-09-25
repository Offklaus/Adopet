import { request } from './api'

/**
 * Envia um pedido de adoção.
 * Corpo: { petId, name, email, phone, city, housing, hasOtherPets, message, agreeVisit }
 */
export async function createAdoptionRequest(data) {
  return request('/adoptions', { method: 'POST', body: data })
}

/**
 * Aprova ou recusa um pedido (administração). status: 'approved' | 'rejected'.
 * Resposta: { request, pet: { id, name, status }, autoRejected }.
 */
export async function decideAdoptionRequest(id, status, adminKey) {
  return request(`/adoptions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { status },
    headers: { Authorization: `Bearer ${adminKey}` }
  })
}

/** Pedidos da conta logada (a sessão vai no cookie). 401 se ninguém entrou. */
export async function listMyAdoptionRequests() {
  return request('/adoptions/mine')
}

/** Lista os pedidos de adoção (administração: têm dados pessoais e exigem a ADMIN_API_KEY). */
export async function listAdoptionRequests(adminKey) {
  return request('/adoptions', { headers: { Authorization: `Bearer ${adminKey}` } })
}
