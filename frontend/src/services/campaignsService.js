import { request } from './api'

export async function listCampaigns() {
  return request('/campaigns')
}

/** Doações registradas, com o nome da campanha (administração: só para o administrador logado). */
export async function listDonations() {
  return request('/donations')
}

/**
 * Confirma o pagamento de uma doação pendente (administração).
 * Resposta: { donation, campaign: { id, title, raised, goal, supporters } | null }.
 */
export async function markDonationPaid(id) {
  return request(`/donations/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status: 'paid' } })
}

/** Registra a intenção de doar; o pagamento (Pix, cartão) ainda não está integrado. */
export async function createDonation({ campaignId, amount }) {
  return request('/donations', { method: 'POST', body: { campaignId, amount } })
}
