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
export async function decideAdoptionRequest(id, status) {
  return request(`/adoptions/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } })
}

/**
 * Marca que o adotante foi avisado da decisão (administração). Só pedido aprovado ou recusado (senão 409).
 * Resposta: { id, status, notifiedAt }.
 */
export async function markAdoptionNotified(id) {
  return request(`/adoptions/${encodeURIComponent(id)}/notified`, { method: 'POST' })
}

/** Desmarca o aviso (ex.: o WhatsApp abriu, mas a mensagem não foi enviada). Resposta: { id, status, notifiedAt: null }. */
export async function unmarkAdoptionNotified(id) {
  return request(`/adoptions/${encodeURIComponent(id)}/notified`, { method: 'DELETE' })
}

/** Pedidos da conta logada (a sessão vai no cookie). 401 se ninguém entrou. */
export async function listMyAdoptionRequests() {
  return request('/adoptions/mine')
}

/** Lista os pedidos de adoção (administração: têm dados pessoais; só para o administrador logado). */
export async function listAdoptionRequests() {
  return request('/adoptions')
}
