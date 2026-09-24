import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, beforeEach, describe, test } from 'node:test'
import { createApp } from '../src/app.js'
import { config } from '../src/config.js'
import { migrate } from '../src/db/migrate.js'
import { createPool } from '../src/db/pool.js'
import { seed } from './fixtures/seed.js'

// Os testes usam um banco próprio (TEST_DATABASE_URL), porque apagam os dados a cada teste.
const skip = config.testDatabaseUrl ? false : 'defina TEST_DATABASE_URL no backend/.env'

const ORIGIN = 'http://localhost:5173'
const ADMIN_KEY = 'chave-de-teste'
let db
let server
let baseUrl

before(async () => {
  if (skip) return
  db = createPool(config.testDatabaseUrl)
  await migrate(db)
  server = createServer(createApp({ db, corsOrigins: [ORIGIN], adminApiKey: ADMIN_KEY, log: () => {} }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (skip) return
  server.close()
  await db.end()
})

// Cada teste começa com os dados iniciais.
beforeEach(async () => {
  if (!skip) await seed(db)
})

async function api(path, { method = 'GET', body, headers } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
  })
  const text = await response.text()
  return { status: response.status, headers: response.headers, data: text ? JSON.parse(text) : null }
}

const validAdoption = {
  petId: 'thor',
  name: 'Ana Souza',
  email: 'Ana@Exemplo.com',
  phone: '(11) 91234-5678',
  city: 'São Paulo',
  housing: 'apartamento',
  hasOtherPets: false,
  message: 'Tenho tempo para passeios.',
  agreeVisit: true
}

describe('geral', { skip }, () => {
  test('GET /api/health responde ok', async () => {
    const { status, data } = await api('/api/health')
    assert.equal(status, 200)
    assert.deepEqual(data, { status: 'ok' })
  })

  test('rota inexistente devolve 404 em JSON', async () => {
    const { status, data } = await api('/api/nada')
    assert.equal(status, 404)
    assert.equal(data.message, 'Rota não encontrada.')
  })

  test('método errado devolve 405', async () => {
    const { status } = await api('/api/pets', { method: 'DELETE' })
    assert.equal(status, 405)
  })

  test('CORS libera só a origem configurada', async () => {
    const allowed = await api('/api/health', { headers: { Origin: ORIGIN } })
    assert.equal(allowed.headers.get('access-control-allow-origin'), ORIGIN)

    const blocked = await api('/api/health', { headers: { Origin: 'https://outro-site.com' } })
    assert.equal(blocked.headers.get('access-control-allow-origin'), null)
  })

  test('preflight OPTIONS devolve 204', async () => {
    const { status } = await api('/api/adoptions', { method: 'OPTIONS', headers: { Origin: ORIGIN } })
    assert.equal(status, 204)
  })
})

describe('pets', { skip }, () => {
  test('lista todos, mais recentes primeiro, com tags como array', async () => {
    const { status, data } = await api('/api/pets')
    assert.equal(status, 200)
    assert.equal(data.length, 6)
    assert.equal(data[0].id, 'pipoca')
    assert.ok(Array.isArray(data[0].tags))
  })

  test('filtra por espécie', async () => {
    const { data } = await api('/api/pets?species=gato')
    assert.deepEqual(data.map((pet) => pet.id).sort(), ['luna', 'mel', 'nino'])
  })

  test('busca por cidade sem diferenciar maiúsculas', async () => {
    const { data } = await api('/api/pets?q=campinas')
    assert.deepEqual(data.map((pet) => pet.id), ['mel'])
  })

  test('curingas do LIKE na busca são tratados como texto', async () => {
    const { data } = await api('/api/pets?q=%25')
    assert.equal(data.length, 0)
  })

  test('espécie inválida devolve 400', async () => {
    const { status } = await api('/api/pets?species=peixe')
    assert.equal(status, 400)
  })

  test('busca um pet pelo id', async () => {
    const { status, data } = await api('/api/pets/thor')
    assert.equal(status, 200)
    assert.equal(data.name, 'Thor')
  })

  test('pet inexistente devolve 404', async () => {
    const { status, data } = await api('/api/pets/nao-existe')
    assert.equal(status, 404)
    assert.equal(data.message, 'Pet não encontrado.')
  })

  test('devolve endereço, coordenadas e location montado a partir de cidade e UF', async () => {
    const { data } = await api('/api/pets/thor')
    assert.equal(data.neighborhood, 'Mooca')
    assert.equal(data.city, 'São Paulo')
    assert.equal(data.state, 'SP')
    assert.equal(data.latitude, -23.5505)
    assert.equal(data.location, 'São Paulo, SP')
  })
})

describe('cadastro de pets (POST /api/pets)', { skip }, () => {
  const admin = { Authorization: `Bearer ${ADMIN_KEY}` }
  const validPet = {
    name: 'Pé de Pano',
    species: 'cao',
    age: '3 anos',
    sex: 'Macho',
    size: 'Porte grande',
    tags: ['Vacinado', 'Castrado'],
    story: 'Resgatado em uma chácara.',
    photo: 'https://exemplo.com/pe-de-pano.jpg',
    photoAlt: 'Pé de Pano, cão caramelo, deitado na grama',
    street: 'Rua das Flores, 100',
    neighborhood: 'Centro',
    city: 'Campinas',
    state: 'sp',
    latitude: -22.9056,
    longitude: -47.0608
  }

  test('cadastra com a chave de administrador e o pet aparece na lista', async () => {
    const { status, data } = await api('/api/pets', { method: 'POST', body: validPet, headers: admin })
    assert.equal(status, 201)
    assert.match(data.id, /^pe-de-pano-[0-9a-f]{6}$/)
    assert.equal(data.state, 'SP')
    assert.equal(data.status, 'available')
    assert.equal(data.location, 'Campinas, SP')

    const { data: list } = await api('/api/pets?q=campinas')
    assert.deepEqual(list.map((pet) => pet.name).sort(), ['Mel', 'Pé de Pano'])
  })

  test('sem chave devolve 401', async () => {
    const { status } = await api('/api/pets', { method: 'POST', body: validPet })
    assert.equal(status, 401)
  })

  test('chave errada devolve 401', async () => {
    const { status } = await api('/api/pets', {
      method: 'POST',
      body: validPet,
      headers: { Authorization: 'Bearer chave-errada' }
    })
    assert.equal(status, 401)
  })

  test('devolve os erros de cada campo', async () => {
    const { status, data } = await api('/api/pets', {
      method: 'POST',
      headers: admin,
      body: { name: '', species: 'peixe', sex: 'x', size: 'x', state: 'XX', latitude: 10, photo: 'ftp://x' }
    })
    assert.equal(status, 422)
    assert.deepEqual(
      Object.keys(data.errors).sort(),
      ['age', 'city', 'latitude', 'name', 'photo', 'sex', 'size', 'species', 'state']
    )
  })

  test('campos opcionais podem ficar de fora', async () => {
    const { status, data } = await api('/api/pets', {
      method: 'POST',
      headers: admin,
      body: { name: 'Mia', species: 'gato', age: '8 meses', sex: 'Fêmea', size: 'Porte pequeno', city: 'Recife', state: 'PE' }
    })
    assert.equal(status, 201)
    assert.deepEqual(data.tags, [])
    assert.equal(data.street, null)
    assert.equal(data.latitude, null)
  })
})

describe('edição de pets (PUT /api/pets/:id)', { skip }, () => {
  const admin = { Authorization: `Bearer ${ADMIN_KEY}` }
  const thorEditado = {
    name: 'Thor Editado',
    species: 'cao',
    age: '3 anos',
    sex: 'Macho',
    size: 'Porte grande',
    status: 'reserved',
    tags: ['Vacinado'],
    story: 'História nova.',
    neighborhood: 'Centro',
    city: 'Campinas',
    state: 'SP'
  }

  test('atualiza todos os campos e mantém id e data de cadastro', async () => {
    const { data: antes } = await api('/api/pets/thor')
    const { status, data } = await api('/api/pets/thor', { method: 'PUT', body: thorEditado, headers: admin })
    assert.equal(status, 200)
    assert.equal(data.id, 'thor')
    assert.equal(data.name, 'Thor Editado')
    assert.equal(data.location, 'Campinas, SP')
    assert.equal(data.status, 'reserved')
    assert.deepEqual(data.tags, ['Vacinado'])
    // Campos não enviados ficam vazios: a edição substitui o cadastro inteiro.
    assert.equal(data.latitude, null)
    assert.equal(data.createdAt, antes.createdAt)

    const { data: depois } = await api('/api/pets/thor')
    assert.equal(depois.name, 'Thor Editado')
  })

  test('pet inexistente devolve 404', async () => {
    const { status } = await api('/api/pets/nao-existe', { method: 'PUT', body: thorEditado, headers: admin })
    assert.equal(status, 404)
  })

  test('sem chave devolve 401 e não altera nada', async () => {
    const { status } = await api('/api/pets/thor', { method: 'PUT', body: thorEditado })
    assert.equal(status, 401)
    const { data } = await api('/api/pets/thor')
    assert.equal(data.name, 'Thor')
  })

  test('dados inválidos devolvem 422 com os erros de cada campo', async () => {
    const { status, data } = await api('/api/pets/thor', {
      method: 'PUT',
      headers: admin,
      body: { ...thorEditado, name: '', state: 'XX' }
    })
    assert.equal(status, 422)
    assert.deepEqual(Object.keys(data.errors).sort(), ['name', 'state'])
  })
})

describe('campanhas e doações', { skip }, () => {
  test('lista campanhas ativas, a mais recente primeiro', async () => {
    const { data } = await api('/api/campaigns')
    assert.deepEqual(data.map((campaign) => campaign.id), ['inverno-2026', 'castracao', 'reforma-canil'])
  })

  test('registra doação para uma campanha como pendente', async () => {
    const { status, data } = await api('/api/donations', {
      method: 'POST',
      body: { campaignId: 'castracao', amount: 100 }
    })
    assert.equal(status, 201)
    assert.equal(data.status, 'pending')
    assert.equal(data.amount, 100)

    // Doação pendente não entra na meta.
    const { data: campaigns } = await api('/api/campaigns')
    assert.equal(campaigns.find((campaign) => campaign.id === 'castracao').raised, 3150)
  })

  test('aceita doação livre (sem campanha)', async () => {
    const { status, data } = await api('/api/donations', { method: 'POST', body: { campaignId: null, amount: 30 } })
    assert.equal(status, 201)
    assert.equal(data.campaignId, null)
  })

  test('rejeita valor inválido com erro no campo', async () => {
    for (const amount of [0, -5, 10.5, '50', 100_001]) {
      const { status, data } = await api('/api/donations', { method: 'POST', body: { amount } })
      assert.equal(status, 422, `valor ${amount}`)
      assert.ok(data.errors.amount)
    }
  })

  test('campanha inexistente devolve 404', async () => {
    const { status } = await api('/api/donations', { method: 'POST', body: { campaignId: 'xyz', amount: 50 } })
    assert.equal(status, 404)
  })
})

describe('pedidos de adoção', { skip }, () => {
  test('cria o pedido e deixa o pet "Em processo"', async () => {
    const { status, data } = await api('/api/adoptions', { method: 'POST', body: validAdoption })
    assert.equal(status, 201)
    assert.equal(data.petId, 'thor')
    assert.equal(data.status, 'received')

    const { data: pet } = await api('/api/pets/thor')
    assert.equal(pet.status, 'reserved')

    const { rows: [saved] } = await db.query('SELECT email, phone FROM adoption_requests WHERE id = $1', [data.id])
    assert.equal(saved.email, 'ana@exemplo.com')
    assert.equal(saved.phone, '11912345678')
  })

  test('aceita pedido para pet já em processo', async () => {
    const { status } = await api('/api/adoptions', { method: 'POST', body: { ...validAdoption, petId: 'pipoca' } })
    assert.equal(status, 201)
  })

  test('recusa pedido para pet já adotado', async () => {
    const { status, data } = await api('/api/adoptions', { method: 'POST', body: { ...validAdoption, petId: 'luna' } })
    assert.equal(status, 409)
    assert.match(data.message, /Luna/)
  })

  test('pet inexistente devolve 404', async () => {
    const { status } = await api('/api/adoptions', { method: 'POST', body: { ...validAdoption, petId: 'xyz' } })
    assert.equal(status, 404)
  })

  test('devolve os erros de cada campo', async () => {
    const { status, data } = await api('/api/adoptions', { method: 'POST', body: { petId: 'thor', agreeVisit: false } })
    assert.equal(status, 422)
    assert.deepEqual(
      Object.keys(data.errors).sort(),
      ['agreeVisit', 'city', 'email', 'hasOtherPets', 'housing', 'name', 'phone']
    )
  })

  test('JSON inválido devolve 400', async () => {
    const { status } = await api('/api/adoptions', { method: 'POST', body: '{nao é json' })
    assert.equal(status, 400)
  })

  test('corpo sem application/json devolve 415', async () => {
    const { status } = await api('/api/adoptions', {
      method: 'POST',
      body: 'x',
      headers: { 'Content-Type': 'text/plain' }
    })
    assert.equal(status, 415)
  })

  test('corpo acima do limite devolve 413', async () => {
    const { status } = await api('/api/adoptions', {
      method: 'POST',
      body: { ...validAdoption, message: 'a'.repeat(200_000) }
    })
    assert.equal(status, 413)
  })
})
