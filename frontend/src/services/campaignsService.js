import { mockCampaigns } from '../data/mockCampaigns'
import { USE_MOCKS, mockDelay, request } from './api'

export async function listCampaigns() {
  if (USE_MOCKS) return mockDelay(mockCampaigns)
  return request('/campaigns')
}

/** Registra a intenção de doar; o checkout (Pix, cartão) virá do backend. */
export async function createDonation({ campaignId, amount }) {
  if (USE_MOCKS) return mockDelay({ id: `mock-${Date.now()}`, campaignId, amount, status: 'pending' })
  return request('/donations', { method: 'POST', body: { campaignId, amount } })
}
