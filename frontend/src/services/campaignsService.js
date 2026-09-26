import { request } from './api'

export async function listCampaigns() {
  return request('/campaigns')
}

/**
 * Cria uma campanha (administração): { title, description, tag?, goal: reais inteiros }.
 * Ela já aparece na página Doar, ativa e com a meta zerada.
 */
export async function createCampaign(data) {
  return request('/campaigns', { method: 'POST', body: data })
}

/** Todas as campanhas, com as encerradas depois das ativas (administração). */
export async function listAllCampaigns() {
  return request('/campaigns?all=true')
}

/** Uma campanha, ativa ou encerrada (`active`, `endedAt`). */
export async function getCampaign(id) {
  return request(`/campaigns/${encodeURIComponent(id)}`)
}

/** Edita uma campanha ativa (administração). Mesmo corpo do createCampaign; arrecadado e apoiadores não mudam. */
export async function updateCampaign(id, data) {
  return request(`/campaigns/${encodeURIComponent(id)}`, { method: 'PUT', body: data })
}

/** Encerra uma campanha (administração): sai da página Doar e não recebe novas doações. Definitivo. */
export async function endCampaign(id) {
  return request(`/campaigns/${encodeURIComponent(id)}`, { method: 'PATCH', body: { active: false } })
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

/**
 * Cancela uma doação pendente ou paga (administração). Se já estava paga, o valor sai da meta.
 * Resposta: { donation: { ..., previousStatus }, campaign | null }.
 */
export async function cancelDonation(id) {
  return request(`/donations/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status: 'canceled' } })
}

/** Registra a intenção de doar; o pagamento (Pix, cartão) ainda não está integrado. */
export async function createDonation({ campaignId, amount }) {
  return request('/donations', { method: 'POST', body: { campaignId, amount } })
}
