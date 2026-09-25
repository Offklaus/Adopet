import { withTransaction } from '../../db/pool.js'
import { HttpError, readJson } from '../../lib/http.js'
import { assertBodyIsObject, assertValid } from '../../lib/validate.js'
import { createCampaignsRepository } from '../campaigns/campaignsRepository.js'
import { createDonationsRepository } from './donationsRepository.js'

const MIN_AMOUNT = 1
const MAX_AMOUNT = 100_000
const STATUSES = ['pending', 'paid', 'canceled']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `requireAdmin(req)` vem do app.js: a lista de doações é só para o administrador. */
export function registerDonationsRoutes(router, db, { requireAdmin }) {
  const donations = createDonationsRepository(db)
  const campaigns = createCampaignsRepository(db)

  // GET /api/donations?status=pending|paid|canceled&campaignId=<id>|livre (administração)
  router.get('/api/donations', async ({ req, query }) => {
    await requireAdmin(req)
    const status = query.get('status') || undefined
    const campaignId = query.get('campaignId') || undefined
    if (status && !STATUSES.includes(status)) {
      throw new HttpError(400, `Status inválido. Use ${STATUSES.join(', ')}.`)
    }
    return { status: 200, body: await donations.list({ status, campaignId }) }
  })

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

    if (campaignId && !(await campaigns.findActiveById(campaignId))) {
      throw new HttpError(404, 'Campanha não encontrada ou encerrada.')
    }

    return { status: 201, body: await donations.create({ campaignId, amount: body.amount }) }
  })

  // PATCH /api/donations/:id  { status: 'paid' } (administração): confirma o pagamento.
  // Só doações pendentes; o valor entra na meta da campanha (raised) e conta um apoiador.
  router.patch('/api/donations/:id', async ({ req, params }) => {
    await requireAdmin(req)
    const body = await readJson(req)
    assertBodyIsObject(body)
    if (body.status !== 'paid') assertValid({ status: 'Use "paid" para marcar a doação como paga.' })
    if (!UUID.test(params.id)) throw new HttpError(404, 'Doação não encontrada.')

    const result = await withTransaction(db, async (client) => {
      const donationsTx = createDonationsRepository(client)
      const donation = await donationsTx.findByIdForUpdate(params.id)
      if (!donation) throw new HttpError(404, 'Doação não encontrada.')
      if (donation.status !== 'pending') {
        throw new HttpError(409, `Esta doação já está ${donation.status === 'paid' ? 'paga' : 'cancelada'}.`)
      }
      await donationsTx.markPaid(donation.id)
      const campaign = donation.campaign_id
        ? await createCampaignsRepository(client).addDonation(donation.campaign_id, donation.amount)
        : null
      return {
        donation: { id: donation.id, status: 'paid', amount: donation.amount },
        campaign: campaign && { id: campaign.id, title: campaign.title, raised: campaign.raised, goal: campaign.goal, supporters: campaign.supporters }
      }
    })
    return { status: 200, body: result }
  })
}
