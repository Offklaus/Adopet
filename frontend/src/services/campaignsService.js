import { request } from './api'

export async function listCampaigns() {
  return request('/campaigns')
}

/** Doações registradas, com o nome da campanha (administração: só para o administrador logado). */
export async function listDonations() {
  return request('/donations')
}

/** Registra a intenção de doar; o pagamento (Pix, cartão) ainda não está integrado. */
export async function createDonation({ campaignId, amount }) {
  return request('/donations', { method: 'POST', body: { campaignId, amount } })
}
