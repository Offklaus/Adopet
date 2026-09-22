import { createCampaignsRepository } from './campaignsRepository.js'

export function registerCampaignsRoutes(router, db) {
  const campaigns = createCampaignsRepository(db)

  router.get('/api/campaigns', () => ({ status: 200, body: campaigns.listActive() }))
}
