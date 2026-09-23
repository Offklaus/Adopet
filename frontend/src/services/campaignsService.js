import { request } from './api'

export async function listCampaigns() {
  return request('/campaigns')
}

/** Registra a intenção de doar; o pagamento (Pix, cartão) ainda não está integrado. */
export async function createDonation({ campaignId, amount }) {
  return request('/donations', { method: 'POST', body: { campaignId, amount } })
}
