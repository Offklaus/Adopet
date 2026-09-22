import { USE_MOCKS, mockDelay, request } from './api'

/**
 * Envia um pedido de adoção.
 * Corpo: { petId, name, email, phone, city, housing, hasOtherPets, agreeVisit }
 */
export async function createAdoptionRequest(data) {
  if (USE_MOCKS) return mockDelay({ id: `mock-${Date.now()}`, status: 'received', ...data }, 600)
  return request('/adoptions', { method: 'POST', body: data })
}
