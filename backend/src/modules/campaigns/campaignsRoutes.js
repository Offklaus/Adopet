import { HttpError, readJson } from '../../lib/http.js'
import { assertBodyIsObject, assertValid, normalizePhone, requiredText } from '../../lib/validate.js'
import { createCampaignsRepository } from './campaignsRepository.js'

const MAX_VALUE = 10_000_000

const optionalText = (value, max) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim().length <= max)

/**
 * Valida o corpo da campanha. O site não recebe dinheiro: `raised` é o valor que a ONG já recebeu,
 * informado pelo administrador, e `whatsapp` é o número para onde o botão "Doar" leva a mensagem.
 */
function parseCampaign(body) {
  const errors = {}
  if (!requiredText(body.title, 80)) errors.title = 'Informe o título (até 80 caracteres).'
  if (!requiredText(body.description, 300)) errors.description = 'Conte para que é a campanha (até 300 caracteres).'
  if (!optionalText(body.tag, 30)) errors.tag = 'A etiqueta pode ter até 30 caracteres.'
  if (!Number.isInteger(body.goal) || body.goal < 1 || body.goal > MAX_VALUE) {
    errors.goal = `Informe a meta em reais inteiros, de R$ 1 a R$ ${MAX_VALUE.toLocaleString('pt-BR')}.`
  }
  const raised = body.raised ?? 0
  if (!Number.isInteger(raised) || raised < 0 || raised > MAX_VALUE) {
    errors.raised = 'Informe o valor arrecadado em reais inteiros (0 ou mais).'
  }
  const whatsapp = normalizePhone(body.whatsapp)
  if (!whatsapp) errors.whatsapp = 'Informe o WhatsApp da ONG com DDD, por exemplo (35) 99999-9999.'
  assertValid(errors)

  return {
    title: body.title.trim(),
    description: body.description.trim(),
    tag: typeof body.tag === 'string' && body.tag.trim() ? body.tag.trim() : null,
    goal: body.goal,
    raised,
    whatsapp
  }
}

/** `requireAdmin(req)` vem do app.js: só o administrador cria, edita e encerra campanhas. */
export function registerCampaignsRoutes(router, db, { requireAdmin }) {
  const campaigns = createCampaignsRepository(db)

  // GET /api/campaigns: ativas (páginas Doar e Home). Com ?all=true (administração): também as encerradas.
  router.get('/api/campaigns', async ({ req, query }) => {
    if (query.get('all') === 'true') {
      await requireAdmin(req)
      return { status: 200, body: await campaigns.listAll() }
    }
    return { status: 200, body: await campaigns.listActive() }
  })

  router.get('/api/campaigns/:id', async ({ params }) => {
    const campaign = await campaigns.findById(params.id)
    if (!campaign) throw new HttpError(404, 'Campanha não encontrada.')
    return { status: 200, body: campaign }
  })

  router.post('/api/campaigns', async ({ req }) => {
    await requireAdmin(req)
    const body = await readJson(req)
    assertBodyIsObject(body)
    return { status: 201, body: await campaigns.create(parseCampaign(body)) }
  })

  /** 404 se não existe; 409 se já foi encerrada (encerrar é definitivo). */
  async function notEditable(id) {
    const campaign = await campaigns.findById(id)
    if (!campaign) return new HttpError(404, 'Campanha não encontrada.')
    return new HttpError(409, `A campanha "${campaign.title}" já foi encerrada e não pode ser alterada.`)
  }

  // PUT /api/campaigns/:id (administração): mesmo corpo do POST, inclusive o valor arrecadado.
  router.put('/api/campaigns/:id', async ({ req, params }) => {
    await requireAdmin(req)
    const body = await readJson(req)
    assertBodyIsObject(body)
    const campaign = await campaigns.update(params.id, parseCampaign(body))
    if (!campaign) throw await notEditable(params.id)
    return { status: 200, body: campaign }
  })

  // PATCH /api/campaigns/:id  { active: false } (administração): encerra; a campanha sai da página Doar.
  router.patch('/api/campaigns/:id', async ({ req, params }) => {
    await requireAdmin(req)
    const body = await readJson(req)
    assertBodyIsObject(body)
    if (body.active !== false) assertValid({ active: 'Use { "active": false } para encerrar a campanha.' })
    const campaign = await campaigns.end(params.id)
    if (!campaign) throw await notEditable(params.id)
    return { status: 200, body: campaign }
  })
}
