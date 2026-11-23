import { request } from './api'

/**
 * Campanhas de arrecadação. O site não recebe dinheiro: o botão "Doar" abre o WhatsApp da ONG
 * (`whatsapp`, DDD + número) e o administrador atualiza o valor arrecadado (`raised`) à mão.
 */

/** Campanhas ativas (páginas Doar e Home). */
export async function listCampaigns() {
  return request('/campaigns')
}

/** Todas as campanhas, com as encerradas depois das ativas (administração). */
export async function listAllCampaigns() {
  return request('/campaigns?all=true')
}

/** Uma campanha, ativa ou encerrada (`active`, `endedAt`). */
export async function getCampaign(id) {
  return request(`/campaigns/${encodeURIComponent(id)}`)
}

/**
 * Cria uma campanha (administração):
 * { title, description, tag?, goal, raised?, whatsapp } (valores em reais inteiros; raised começa em 0).
 */
export async function createCampaign(data) {
  return request('/campaigns', { method: 'POST', body: data })
}

/** Edita uma campanha ativa (administração), inclusive o valor arrecadado. Mesmo corpo do createCampaign. */
export async function updateCampaign(id, data) {
  return request(`/campaigns/${encodeURIComponent(id)}`, { method: 'PUT', body: data })
}

/** Encerra uma campanha (administração): sai da página Doar. Definitivo. */
export async function endCampaign(id) {
  return request(`/campaigns/${encodeURIComponent(id)}`, { method: 'PATCH', body: { active: false } })
}
