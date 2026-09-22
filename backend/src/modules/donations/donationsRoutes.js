import { HttpError, readJson } from '../../lib/http.js'
import { assertBodyIsObject, assertValid } from '../../lib/validate.js'
import { createCampaignsRepository } from '../campaigns/campaignsRepository.js'
import { createDonationsRepository } from './donationsRepository.js'

const MIN_AMOUNT = 1
const MAX_AMOUNT = 100_000

export function registerDonationsRoutes(router, db) {
  const donations = createDonationsRepository(db)
  const campaigns = createCampaignsRepository(db)

  // POST /api/donations  { campaignId: string | null, amount: number (reais inteiros) }
  router.post('/api/donations', async ({ req }) => {
    const body = await readJson(req)
    assertBodyIsObject(body)

    const campaignId = body.campaignId ?? null
    const errors = {}
    if (!Number.isInteger(body.amount) || body.amount < MIN_AMOUNT || body.amount > MAX_AMOUNT) {
      errors.amount = `Informe um valor inteiro entre R$ ${MIN_AMOUNT} e R$ ${MAX_AMOUNT.toLocaleString('pt-BR')}.`
    }
    if (campaignId !== null && typeof campaignId !== 'string') {
      errors.campaignId = 'Campanha inválida.'
    }
    assertValid(errors)

    if (campaignId && !campaigns.findActiveById(campaignId)) {
      throw new HttpError(404, 'Campanha não encontrada ou encerrada.')
    }

    return { status: 201, body: donations.create({ campaignId, amount: body.amount }) }
  })
}
