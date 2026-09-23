import { requireAdmin } from '../../lib/auth.js'
import { HttpError, readJson } from '../../lib/http.js'
import { assertBodyIsObject, assertValid, requiredText } from '../../lib/validate.js'
import { createPetsRepository } from './petsRepository.js'

const SPECIES = ['cao', 'gato']
const SEXES = ['Macho', 'Fêmea']
const SIZES = ['Porte pequeno', 'Porte médio', 'Porte grande']
const STATUSES = ['available', 'reserved', 'adopted']
const STATES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
]

const optionalText = (value, max) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim().length <= max)
const cleanText = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null)
const isCoordinate = (value, limit) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit

function isHttpUrl(value) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

/** Valida o corpo do cadastro e devolve os dados já limpos. */
function parsePet(body) {
  const errors = {}
  if (!requiredText(body.name, 60)) errors.name = 'Informe o nome (até 60 caracteres).'
  if (!SPECIES.includes(body.species)) errors.species = 'Espécie deve ser "cao" ou "gato".'
  if (!requiredText(body.age, 30)) errors.age = 'Informe a idade, por exemplo "2 anos" ou "4 meses".'
  if (!SEXES.includes(body.sex)) errors.sex = `Sexo deve ser ${SEXES.join(' ou ')}.`
  if (!SIZES.includes(body.size)) errors.size = `Porte deve ser ${SIZES.join(', ')}.`
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    errors.status = `Status deve ser ${STATUSES.join(', ')}.`
  }

  const tags = body.tags ?? []
  if (!Array.isArray(tags) || tags.length > 5 || !tags.every((tag) => requiredText(tag, 20))) {
    errors.tags = 'Use até 5 etiquetas curtas (até 20 caracteres cada).'
  }

  if (!optionalText(body.story, 2000)) errors.story = 'A história pode ter até 2.000 caracteres.'
  if (body.photo != null && (typeof body.photo !== 'string' || body.photo.length > 500 || !isHttpUrl(body.photo))) {
    errors.photo = 'A foto deve ser um link http(s).'
  }
  if (!optionalText(body.photoAlt, 200)) errors.photoAlt = 'A descrição da foto pode ter até 200 caracteres.'

  if (!optionalText(body.street, 120)) errors.street = 'A rua pode ter até 120 caracteres.'
  if (!optionalText(body.neighborhood, 80)) errors.neighborhood = 'O bairro pode ter até 80 caracteres.'
  if (!requiredText(body.city, 80)) errors.city = 'Informe a cidade.'
  const state = typeof body.state === 'string' ? body.state.trim().toUpperCase() : ''
  if (!STATES.includes(state)) errors.state = 'Informe a UF com 2 letras, por exemplo "SP".'

  const hasLat = body.latitude != null
  const hasLng = body.longitude != null
  if (hasLat !== hasLng) {
    errors.latitude = 'Informe latitude e longitude juntas.'
  } else if (hasLat) {
    if (!isCoordinate(body.latitude, 90)) errors.latitude = 'Latitude deve ser um número entre -90 e 90.'
    if (!isCoordinate(body.longitude, 180)) errors.longitude = 'Longitude deve ser um número entre -180 e 180.'
  }
  assertValid(errors)

  return {
    name: body.name.trim(),
    species: body.species,
    age: body.age.trim(),
    sex: body.sex,
    size: body.size,
    tags: tags.map((tag) => tag.trim()),
    status: body.status ?? 'available',
    photo: cleanText(body.photo),
    photoAlt: cleanText(body.photoAlt),
    story: cleanText(body.story) ?? '',
    street: cleanText(body.street),
    neighborhood: cleanText(body.neighborhood),
    city: body.city.trim(),
    state,
    latitude: hasLat ? body.latitude : null,
    longitude: hasLng ? body.longitude : null
  }
}

export function registerPetsRoutes(router, db, { adminApiKey } = {}) {
  const pets = createPetsRepository(db)

  // GET /api/pets?species=cao|gato&q=texto
  router.get('/api/pets', async ({ query }) => {
    const species = query.get('species') || undefined
    const q = query.get('q')?.trim().slice(0, 100) || undefined
    if (species && !SPECIES.includes(species)) {
      throw new HttpError(400, 'Espécie inválida. Use "cao" ou "gato".')
    }
    return { status: 200, body: await pets.list({ species, q }) }
  })

  router.get('/api/pets/:id', async ({ params }) => {
    const pet = await pets.findById(params.id)
    if (!pet) throw new HttpError(404, 'Pet não encontrado.')
    return { status: 200, body: pet }
  })

  // POST /api/pets (administração): cadastra um animal. Exige Authorization: Bearer <ADMIN_API_KEY>.
  router.post('/api/pets', async ({ req }) => {
    requireAdmin(req, adminApiKey)
    const body = await readJson(req)
    assertBodyIsObject(body)
    return { status: 201, body: await pets.create(parsePet(body)) }
  })
}
