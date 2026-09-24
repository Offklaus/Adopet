import { withTransaction } from '../../db/pool.js'
import { requireAdmin } from '../../lib/auth.js'
import { HttpError, readJson } from '../../lib/http.js'
import { assertBodyIsObject, assertValid, isEmail, isPhone, requiredText } from '../../lib/validate.js'
import { createCurrentUser } from '../auth/session.js'
import { createPetsRepository } from '../pets/petsRepository.js'
import { createAdoptionsRepository } from './adoptionsRepository.js'

const HOUSING = ['casa-quintal', 'casa', 'apartamento']
const STATUSES = ['received', 'approved', 'rejected']

/** Mesmas regras do formulário do frontend (AdoptionForm.jsx). */
function validateAdoption(body) {
  const errors = {}
  if (typeof body.petId !== 'string' || !body.petId) errors.petId = 'Informe o pet.'
  if (!requiredText(body.name, 120)) errors.name = 'Informe seu nome.'
  if (!isEmail(body.email)) errors.email = 'Informe um e-mail válido.'
  if (!isPhone(body.phone)) errors.phone = 'Informe um telefone com DDD.'
  if (!requiredText(body.city, 120)) errors.city = 'Informe sua cidade.'
  if (!HOUSING.includes(body.housing)) errors.housing = 'Escolha o tipo de moradia.'
  if (typeof body.hasOtherPets !== 'boolean') errors.hasOtherPets = 'Informe se já tem outros pets.'
  if (body.message !== undefined && (typeof body.message !== 'string' || body.message.length > 2000)) {
    errors.message = 'A mensagem pode ter até 2.000 caracteres.'
  }
  if (body.agreeVisit !== true) errors.agreeVisit = 'É preciso aceitar a visita para seguir.'
  assertValid(errors)
}

export function registerAdoptionsRoutes(router, pool, { adminApiKey } = {}) {
  const currentUser = createCurrentUser(pool)

  // GET /api/adoptions/mine: pedidos da conta logada (só os dela).
  router.get('/api/adoptions/mine', async ({ req }) => {
    const user = await currentUser(req)
    if (!user) throw new HttpError(401, 'Entre na sua conta para ver seus pedidos.')
    return { status: 200, body: await createAdoptionsRepository(pool).list({ userId: user.id }) }
  })

  // GET /api/adoptions?status=&petId= (administração): tem dados pessoais, exige a chave.
  router.get('/api/adoptions', async ({ req, query }) => {
    requireAdmin(req, adminApiKey)
    const status = query.get('status') || undefined
    const petId = query.get('petId') || undefined
    if (status && !STATUSES.includes(status)) {
      throw new HttpError(400, `Status inválido. Use ${STATUSES.join(', ')}.`)
    }
    return { status: 200, body: await createAdoptionsRepository(pool).list({ status, petId }) }
  })

  // POST /api/adoptions  { petId, name, email, phone, city, housing, hasOtherPets, message?, agreeVisit }
  router.post('/api/adoptions', async ({ req }) => {
    const body = await readJson(req)
    assertBodyIsObject(body)
    validateAdoption(body)
    // Se a pessoa está logada, o pedido fica ligado à conta dela ("Meus pedidos").
    const user = await currentUser(req)

    const created = await withTransaction(pool, async (client) => {
      const pets = createPetsRepository(client)
      const adoptions = createAdoptionsRepository(client)

      const pet = await pets.findByIdForUpdate(body.petId)
      if (!pet) throw new HttpError(404, 'Pet não encontrado.')
      if (pet.status === 'adopted') throw new HttpError(409, `${pet.name} já foi adotado.`)

      const request = await adoptions.create({
        petId: pet.id,
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone.replace(/\D/g, ''),
        city: body.city.trim(),
        housing: body.housing,
        hasOtherPets: body.hasOtherPets,
        message: body.message?.trim() ?? '',
        agreeVisit: true,
        userId: user?.id ?? null
      })
      // O primeiro pedido deixa o pet "Em processo" no site.
      if (pet.status === 'available') await pets.updateStatus(pet.id, 'reserved')
      return request
    })

    return { status: 201, body: created }
  })
}
