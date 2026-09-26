import { readJson } from '../../lib/http.js'
import { assertBodyIsObject, assertValid, requiredText } from '../../lib/validate.js'
import { createCampaignsRepository } from './campaignsRepository.js'

const MAX_GOAL = 10_000_000

const optionalText = (value, max) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim().length <= max)

/** Valida o corpo da nova campanha e devolve os dados já limpos. */
function parseCampaign(body) {
  const errors = {}
  if (!requiredText(body.title, 80)) errors.title = 'Informe o título (até 80 caracteres).'
  if (!requiredText(body.description, 300)) {
    errors.description = 'Conte para que é a campanha (até 300 caracteres).'
  }
  if (!optionalText(body.tag, 30)) errors.tag = 'A etiqueta pode ter até 30 caracteres.'
  if (!Number.isInteger(body.goal) || body.goal < 1 || body.goal > MAX_GOAL) {
    errors.goal = `Informe a meta em reais inteiros, de R$ 1 a R$ ${MAX_GOAL.toLocaleString('pt-BR')}.`
  }
  assertValid(errors)

  return {
    title: body.title.trim(),
    description: body.description.trim(),
    tag: typeof body.tag === 'string' && body.tag.trim() ? body.tag.trim() : null,
    goal: body.goal
  }
}

/** `requireAdmin(req)` vem do app.js: só o administrador cria campanhas. */
export function registerCampaignsRoutes(router, db, { requireAdmin }) {
  const campaigns = createCampaignsRepository(db)

  router.get('/api/campaigns', async () => ({ status: 200, body: await campaigns.listActive() }))

  // POST /api/campaigns (administração)  { title, description, tag?, goal: reais inteiros }
  router.post('/api/campaigns', async ({ req }) => {
    await requireAdmin(req)
    const body = await readJson(req)
    assertBodyIsObject(body)
    return { status: 201, body: await campaigns.create(parseCampaign(body)) }
  })
}
