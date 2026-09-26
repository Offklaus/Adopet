import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, beforeEach, describe, test } from 'node:test'
import { createApp } from '../src/app.js'
import { config } from '../src/config.js'
import { migrate } from '../src/db/migrate.js'
import { createPool } from '../src/db/pool.js'
import { InvalidGoogleTokenError } from '../src/lib/google.js'
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
  server = createServer(createApp({
    db,
    corsOrigins: [ORIGIN],
    adminApiKey: ADMIN_KEY,
    googleClientId: 'client-de-teste',
    adminEmails: ['admin@exemplo.com'],
    // Google falso: "google-ana" e "google-bia" são tokens válidos; o resto é inválido.
    verifyGoogle: async (credential) => {
      if (credential === 'google-ana') return { sub: 'g-ana', email: 'ana@exemplo.com', name: 'Ana do Google' }
      if (credential === 'google-bia') return { sub: 'g-bia', email: 'bia@exemplo.com', name: 'Bia' }
      if (credential === 'google-admin') return { sub: 'g-admin', email: 'admin@exemplo.com', name: 'Admin' }
      throw new InvalidGoogleTokenError('teste')
    },
    log: () => {}
  }))
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

// Pedido de adoção exige conta logada: os testes usam uma conta de adotante (criada na primeira vez em cada teste).
async function adopterHeaders() {
  const account = { name: 'Adotante', email: 'adotante@exemplo.com', password: 'senha-forte-123', confirmPassword: 'senha-forte-123' }
  let response = await api('/api/auth/register', { method: 'POST', body: account })
  if (response.status === 409) {
    response = await api('/api/auth/login', { method: 'POST', body: { email: account.email, password: account.password } })
  }
  return { Cookie: response.headers.get('set-cookie').split(';')[0] }
}

/** POST /api/adoptions já logado como adotante (ou com os cabeçalhos passados). */
async function adopt(body, headers) {
  return api('/api/adoptions', { method: 'POST', body, headers: headers ?? (await adopterHeaders()) })
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

describe('exclusão de pets (DELETE /api/pets/:id)', { skip }, () => {
  const admin = { Authorization: `Bearer ${ADMIN_KEY}` }

  test('exclui um pet sem pedidos de adoção', async () => {
    const { status, data } = await api('/api/pets/bento', { method: 'DELETE', headers: admin })
    assert.equal(status, 200)
    assert.deepEqual(data, { id: 'bento', deleted: true })

    const { status: depois } = await api('/api/pets/bento')
    assert.equal(depois, 404)
    const { data: lista } = await api('/api/pets')
    assert.equal(lista.length, 5)
  })

  test('recusa (409) se houver pedido de adoção e mantém o pet', async () => {
    await adopt({ ...validAdoption, petId: 'thor' })
    const { status, data } = await api('/api/pets/thor', { method: 'DELETE', headers: admin })
    assert.equal(status, 409)
    assert.match(data.message, /Thor tem 1 pedido/)

    const { status: aindaExiste } = await api('/api/pets/thor')
    assert.equal(aindaExiste, 200)
  })

  test('pet inexistente devolve 404', async () => {
    const { status } = await api('/api/pets/nao-existe', { method: 'DELETE', headers: admin })
    assert.equal(status, 404)
  })

  test('sem chave devolve 401 e não exclui', async () => {
    const { status } = await api('/api/pets/bento', { method: 'DELETE' })
    assert.equal(status, 401)
    const { status: aindaExiste } = await api('/api/pets/bento')
    assert.equal(aindaExiste, 200)
  })
})

describe('fotos enviadas (/api/photos)', { skip }, () => {
  const admin = { Authorization: `Bearer ${ADMIN_KEY}` }
  // Só a assinatura importa para a API: os primeiros bytes de cada formato.
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('resto-do-png')])
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('resto-do-jpeg')])

  async function upload(data, { type = 'image/png', headers = admin } = {}) {
    const response = await fetch(`${baseUrl}/api/photos`, {
      method: 'POST',
      headers: { 'Content-Type': type, ...headers },
      body: data
    })
    return { status: response.status, data: await response.json() }
  }

  async function getPhoto(url) {
    const response = await fetch(`${baseUrl}${url}`)
    return { status: response.status, headers: response.headers, bytes: Buffer.from(await response.arrayBuffer()) }
  }

  test('envia a imagem e ela volta igual, com o tipo detectado e cache longo', async () => {
    const { status, data } = await upload(png)
    assert.equal(status, 201)
    assert.match(data.url, /^\/api\/photos\/[0-9a-f-]{36}$/)
    assert.equal(data.contentType, 'image/png')

    const photo = await getPhoto(data.url)
    assert.equal(photo.status, 200)
    assert.equal(photo.headers.get('content-type'), 'image/png')
    assert.match(photo.headers.get('cache-control'), /immutable/)
    assert.ok(photo.bytes.equals(png))
  })

  test('o tipo vem dos bytes, não do Content-Type declarado', async () => {
    const { data } = await upload(jpeg, { type: 'image/png' })
    assert.equal(data.contentType, 'image/jpeg')
  })

  test('recusa o que não é JPG, PNG ou WebP (415) e arquivo acima de 5 MB (413)', async () => {
    const fake = await upload(Buffer.from('<svg onload="alert(1)"></svg>'), { type: 'image/svg+xml' })
    assert.equal(fake.status, 415)
    const text = await upload(png, { type: 'text/plain' })
    assert.equal(text.status, 415)
    const big = await upload(Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]))
    assert.equal(big.status, 413)
    assert.match(big.data.message, /5 MB/)
  })

  test('sem login devolve 401', async () => {
    const { status } = await upload(png, { headers: {} })
    assert.equal(status, 401)
  })

  test('foto inexistente ou id inválido devolve 404', async () => {
    assert.equal((await getPhoto('/api/photos/00000000-0000-0000-0000-000000000000')).status, 404)
    assert.equal((await getPhoto('/api/photos/nao-e-uuid')).status, 404)
  })

  test('cadastra o pet com a foto enviada; foto enviada que não existe devolve 422', async () => {
    const { data: photo } = await upload(png)
    const { data: pet } = await api('/api/pets/bento')
    const { status, data } = await api('/api/pets', {
      method: 'POST',
      headers: admin,
      body: { ...pet, name: 'Com foto', photo: photo.url }
    })
    assert.equal(status, 201)
    assert.equal(data.photo, photo.url)

    const missing = await api('/api/pets', {
      method: 'POST',
      headers: admin,
      body: { ...pet, photo: '/api/photos/00000000-0000-0000-0000-000000000000' }
    })
    assert.equal(missing.status, 422)
    assert.match(missing.data.errors.photo, /não foi encontrada/)
  })

  test('trocar a foto apaga a antiga; excluir o pet apaga a foto dele', async () => {
    const { data: first } = await upload(png)
    const { data: second } = await upload(jpeg)
    const { data: pet } = await api('/api/pets/bento')

    await api('/api/pets/bento', { method: 'PUT', headers: admin, body: { ...pet, photo: first.url } })
    await api('/api/pets/bento', { method: 'PUT', headers: admin, body: { ...pet, photo: second.url } })
    assert.equal((await getPhoto(first.url)).status, 404)
    assert.equal((await getPhoto(second.url)).status, 200)

    await api('/api/pets/bento', { method: 'DELETE', headers: admin })
    assert.equal((await getPhoto(second.url)).status, 404)
  })
})

describe('listagem de pedidos de adoção (GET /api/adoptions)', { skip }, () => {
  const admin = { Authorization: `Bearer ${ADMIN_KEY}` }

  test('lista os pedidos com o nome do animal, mais recentes primeiro', async () => {
    await adopt({ ...validAdoption, petId: 'thor', name: 'Primeira Pessoa' })
    await adopt({ ...validAdoption, petId: 'mel', name: 'Segunda Pessoa' })

    const { status, data } = await api('/api/adoptions', { headers: admin })
    assert.equal(status, 200)
    assert.equal(data.length, 2)
    assert.equal(data[0].name, 'Segunda Pessoa')
    assert.equal(data[0].petName, 'Mel')
    assert.equal(data[0].petStatus, 'reserved')
    assert.equal(data[0].email, 'ana@exemplo.com')
    assert.equal(data[0].phone, '11912345678')
    assert.equal(data[0].housing, 'apartamento')
    assert.equal(data[0].status, 'received')
  })

  test('filtra por animal e por status', async () => {
    await adopt({ ...validAdoption, petId: 'thor' })
    await adopt({ ...validAdoption, petId: 'mel' })

    const { data: doThor } = await api('/api/adoptions?petId=thor', { headers: admin })
    assert.deepEqual(doThor.map((request) => request.petId), ['thor'])

    const { data: aprovados } = await api('/api/adoptions?status=approved', { headers: admin })
    assert.equal(aprovados.length, 0)
  })

  test('status inválido devolve 400', async () => {
    const { status } = await api('/api/adoptions?status=xyz', { headers: admin })
    assert.equal(status, 400)
  })

  test('sem chave devolve 401 (os pedidos têm dados pessoais)', async () => {
    const { status, data } = await api('/api/adoptions')
    assert.equal(status, 401)
    assert.equal(Array.isArray(data), false)
  })
})

describe('contas de usuário (/api/auth)', { skip }, () => {
  const newAccount = { name: 'Ana Souza', email: 'Ana@Exemplo.com', password: 'senha-forte-123', confirmPassword: 'senha-forte-123' }
  // "adopet_session=<token>; Path=/; ..." → "adopet_session=<token>"
  const sessionCookie = (headers) => headers.get('set-cookie')?.split(';')[0]

  test('cadastro cria a conta, já entra e não devolve a senha', async () => {
    const { status, data, headers } = await api('/api/auth/register', { method: 'POST', body: newAccount })
    assert.equal(status, 201)
    assert.equal(data.user.email, 'ana@exemplo.com')
    assert.equal(data.user.hasPassword, true)
    assert.equal('password_hash' in data.user, false)

    const setCookie = headers.get('set-cookie')
    assert.match(setCookie, /^adopet_session=[\w-]+; Path=\/; SameSite=Lax; Max-Age=2592000; HttpOnly$/)

    const { data: me } = await api('/api/auth/me', { headers: { Cookie: sessionCookie(headers) } })
    assert.equal(me.user.name, 'Ana Souza')

    const { rows: [saved] } = await db.query('SELECT password_hash FROM users WHERE email = $1', ['ana@exemplo.com'])
    assert.match(saved.password_hash, /^scrypt\$/)
    assert.equal(saved.password_hash.includes('senha-forte-123'), false)
  })

  test('cadastro valida os campos e confere a confirmação da senha', async () => {
    const { status, data } = await api('/api/auth/register', {
      method: 'POST',
      body: { name: '', email: 'x', password: '123', confirmPassword: '456' }
    })
    assert.equal(status, 422)
    assert.deepEqual(Object.keys(data.errors).sort(), ['confirmPassword', 'email', 'name', 'password'])
  })

  test('e-mail já cadastrado devolve 409, sem diferenciar maiúsculas', async () => {
    await api('/api/auth/register', { method: 'POST', body: newAccount })
    const { status, data } = await api('/api/auth/register', { method: 'POST', body: { ...newAccount, email: 'ANA@exemplo.com' } })
    assert.equal(status, 409)
    assert.ok(data.errors.email)
  })

  test('login com senha certa entra; com senha errada ou e-mail inexistente, a mesma mensagem', async () => {
    await api('/api/auth/register', { method: 'POST', body: newAccount })

    const ok = await api('/api/auth/login', { method: 'POST', body: { email: 'ana@exemplo.com', password: 'senha-forte-123' } })
    assert.equal(ok.status, 200)
    assert.ok(sessionCookie(ok.headers))

    const wrong = await api('/api/auth/login', { method: 'POST', body: { email: 'ana@exemplo.com', password: 'errada-123' } })
    const unknown = await api('/api/auth/login', { method: 'POST', body: { email: 'ninguem@exemplo.com', password: 'errada-123' } })
    assert.equal(wrong.status, 401)
    assert.equal(unknown.status, 401)
    assert.equal(wrong.data.message, unknown.data.message)
  })

  test('bloqueia o login depois de 5 senhas erradas (429)', async () => {
    const body = { ...newAccount, email: 'bloqueio@exemplo.com' }
    await api('/api/auth/register', { method: 'POST', body })
    for (let attempt = 0; attempt < 5; attempt++) {
      await api('/api/auth/login', { method: 'POST', body: { email: body.email, password: 'errada-123' } })
    }
    const { status } = await api('/api/auth/login', { method: 'POST', body: { email: body.email, password: body.password } })
    assert.equal(status, 429)
  })

  test('sair apaga a sessão e o cookie', async () => {
    const { headers } = await api('/api/auth/register', { method: 'POST', body: newAccount })
    const cookie = sessionCookie(headers)

    const logout = await api('/api/auth/logout', { method: 'POST', headers: { Cookie: cookie } })
    assert.equal(logout.status, 200)
    assert.match(logout.headers.get('set-cookie'), /^adopet_session=; .*Max-Age=0/)

    const { data: me } = await api('/api/auth/me', { headers: { Cookie: cookie } })
    assert.equal(me.user, null)
  })

  test('sem cookie ou com cookie inventado, ninguém está logado', async () => {
    assert.equal((await api('/api/auth/me')).data.user, null)
    assert.equal((await api('/api/auth/me', { headers: { Cookie: 'adopet_session=inventado' } })).data.user, null)
  })

  test('Google: cria a conta na primeira vez e reutiliza depois', async () => {
    const first = await api('/api/auth/google', { method: 'POST', body: { credential: 'google-bia' } })
    assert.equal(first.status, 200)
    assert.equal(first.data.user.hasGoogle, true)
    assert.equal(first.data.user.hasPassword, false)

    const second = await api('/api/auth/google', { method: 'POST', body: { credential: 'google-bia' } })
    assert.equal(second.data.user.id, first.data.user.id)
  })

  test('Google: liga à conta que já existia, apaga a senha antiga e encerra as sessões dela', async () => {
    const { data: created, headers } = await api('/api/auth/register', { method: 'POST', body: newAccount })
    const oldCookie = sessionCookie(headers)

    const { data } = await api('/api/auth/google', { method: 'POST', body: { credential: 'google-ana' } })
    assert.equal(data.user.id, created.user.id)
    assert.equal(data.user.hasPassword, false)
    assert.equal(data.user.hasGoogle, true)

    // Quem criou a conta com senha não entra mais com ela nem com a sessão antiga.
    const login = await api('/api/auth/login', { method: 'POST', body: { email: newAccount.email, password: newAccount.password } })
    assert.equal(login.status, 401)
    assert.equal((await api('/api/auth/me', { headers: { Cookie: oldCookie } })).data.user, null)
  })

  test('Google: token inválido devolve 401', async () => {
    const { status } = await api('/api/auth/google', { method: 'POST', body: { credential: 'falso' } })
    assert.equal(status, 401)
  })

  test('config informa o Client ID do Google', async () => {
    const { data } = await api('/api/auth/config')
    assert.deepEqual(data, { googleClientId: 'client-de-teste' })
  })
})

describe('meus pedidos (GET /api/adoptions/mine)', { skip }, () => {
  async function login(email) {
    const { headers } = await api('/api/auth/register', {
      method: 'POST',
      body: { name: 'Pessoa Teste', email, password: 'senha-forte-123', confirmPassword: 'senha-forte-123' }
    })
    return { Cookie: headers.get('set-cookie').split(';')[0] }
  }

  test('sem estar logado devolve 401', async () => {
    const { status } = await api('/api/adoptions/mine')
    assert.equal(status, 401)
  })

  test('lista só os pedidos feitos pela própria conta, com o animal', async () => {
    const ana = await login('ana@exemplo.com')
    const bia = await login('bia@exemplo.com')

    await api('/api/adoptions', { method: 'POST', body: { ...validAdoption, petId: 'thor' }, headers: ana })
    await api('/api/adoptions', { method: 'POST', body: { ...validAdoption, petId: 'mel' }, headers: bia })

    const { status, data } = await api('/api/adoptions/mine', { headers: ana })
    assert.equal(status, 200)
    assert.deepEqual(data.map((request) => request.petId), ['thor'])
    assert.equal(data[0].petName, 'Thor')
    assert.equal(data[0].status, 'received')
    assert.ok('petPhoto' in data[0])

    const { data: daBia } = await api('/api/adoptions/mine', { headers: bia })
    assert.deepEqual(daBia.map((request) => request.petId), ['mel'])
  })

  test('pedido sem login devolve 401, não cria o pedido e não mexe no pet', async () => {
    const semLogin = await api('/api/adoptions', { method: 'POST', body: validAdoption })
    assert.equal(semLogin.status, 401)
    assert.match(semLogin.data.message, /Entre na sua conta/)
    const cookieInventado = await adopt(validAdoption, { Cookie: 'adopet_session=inventado' })
    assert.equal(cookieInventado.status, 401)

    const { rows: [{ total }] } = await db.query('SELECT COUNT(*)::int AS total FROM adoption_requests')
    assert.equal(total, 0)
    assert.equal((await api('/api/pets/thor')).data.status, 'available')
  })

  test('o pedido fica ligado à conta logada', async () => {
    const { status, data } = await adopt(validAdoption)
    assert.equal(status, 201)
    const { rows: [saved] } = await db.query(
      'SELECT u.email FROM adoption_requests r JOIN users u ON u.id = r.user_id WHERE r.id = $1',
      [data.id]
    )
    assert.equal(saved.email, 'adotante@exemplo.com')
  })
})

describe('aprovar ou recusar pedidos (PATCH /api/adoptions/:id)', { skip }, () => {
  const admin = { Authorization: `Bearer ${ADMIN_KEY}` }
  const newRequest = async (petId, name = 'Pessoa') =>
    (await adopt({ ...validAdoption, petId, name })).data.id
  const decide = (id, status, headers = admin) => api(`/api/adoptions/${id}`, { method: 'PATCH', body: { status }, headers })
  const statusOf = async (id) => (await db.query('SELECT status FROM adoption_requests WHERE id = $1', [id])).rows[0].status
  const petStatus = async (id) => (await api(`/api/pets/${id}`)).data.status

  test('aprovar: pet vira adotado e os outros pedidos dele são recusados', async () => {
    const first = await newRequest('thor', 'Primeira')
    const second = await newRequest('thor', 'Segunda')
    const otherPet = await newRequest('mel')

    const { status, data } = await decide(first, 'approved')
    assert.equal(status, 200)
    assert.deepEqual(data.request, { id: first, status: 'approved' })
    assert.equal(data.pet.status, 'adopted')
    assert.equal(data.autoRejected, 1)

    assert.equal(await statusOf(second), 'rejected')
    assert.equal(await statusOf(otherPet), 'received')
    assert.equal(await petStatus('thor'), 'adopted')
    assert.equal(await petStatus('mel'), 'reserved')
  })

  test('recusar o último pedido em aberto devolve o pet para disponível', async () => {
    const only = await newRequest('thor')
    assert.equal(await petStatus('thor'), 'reserved')

    const { data } = await decide(only, 'rejected')
    assert.equal(data.pet.status, 'available')
    assert.equal(await petStatus('thor'), 'available')
  })

  test('recusar com outro pedido em aberto mantém o pet em processo', async () => {
    const first = await newRequest('thor')
    await newRequest('thor')
    const { data } = await decide(first, 'rejected')
    assert.equal(data.pet.status, 'reserved')
  })

  test('pedido já decidido não muda de novo (409)', async () => {
    const id = await newRequest('thor')
    await decide(id, 'rejected')
    const { status, data } = await decide(id, 'approved')
    assert.equal(status, 409)
    assert.match(data.message, /já foi recusado/)
  })

  test('status inválido 422, pedido inexistente 404, sem chave 401', async () => {
    const id = await newRequest('thor')
    assert.equal((await decide(id, 'talvez')).status, 422)
    assert.equal((await decide('nao-e-uuid', 'approved')).status, 404)
    assert.equal((await decide('00000000-0000-0000-0000-000000000000', 'approved')).status, 404)
    assert.equal((await decide(id, 'approved', {})).status, 401)
    assert.equal(await statusOf(id), 'received')
  })
})

describe('adotante avisado (POST e DELETE /api/adoptions/:id/notified)', { skip }, () => {
  const admin = { Authorization: `Bearer ${ADMIN_KEY}` }
  const newRequest = async (petId = 'thor') => (await adopt({ ...validAdoption, petId })).data.id
  const decide = (id, status) => api(`/api/adoptions/${id}`, { method: 'PATCH', body: { status }, headers: admin })
  const notify = (id, method = 'POST', headers = admin) => api(`/api/adoptions/${id}/notified`, { method, headers })
  const listed = async (id) => (await api('/api/adoptions', { headers: admin })).data.find((request) => request.id === id)

  test('pedido novo aparece como não avisado', async () => {
    const id = await newRequest()
    assert.equal((await listed(id)).notifiedAt, null)
  })

  test('marca o aviso de um pedido decidido e a lista mostra a data; desmarcar volta a vazio', async () => {
    const id = await newRequest()
    await decide(id, 'approved')

    const { status, data } = await notify(id)
    assert.equal(status, 200)
    assert.equal(data.status, 'approved')
    assert.ok(data.notifiedAt)
    assert.equal((await listed(id)).notifiedAt, data.notifiedAt)

    const undo = await notify(id, 'DELETE')
    assert.equal(undo.status, 200)
    assert.equal(undo.data.notifiedAt, null)
    assert.equal((await listed(id)).notifiedAt, null)
  })

  test('vale também para pedido recusado automaticamente', async () => {
    const approved = await newRequest()
    const other = await newRequest()
    await decide(approved, 'approved')
    const { status, data } = await notify(other)
    assert.equal(status, 200)
    assert.equal(data.status, 'rejected')
  })

  test('pedido ainda em aberto não pode ser marcado (409)', async () => {
    const id = await newRequest()
    const { status, data } = await notify(id)
    assert.equal(status, 409)
    assert.match(data.message, /ainda não foi aprovado nem recusado/)
    assert.equal((await listed(id)).notifiedAt, null)
  })

  test('pedido inexistente 404; sem login 401; adotante logado 403', async () => {
    assert.equal((await notify('00000000-0000-0000-0000-000000000000')).status, 404)
    assert.equal((await notify('nao-e-uuid')).status, 404)
    const id = await newRequest()
    await decide(id, 'rejected')
    assert.equal((await notify(id, 'POST', {})).status, 401)
    const adopter = await adopterHeaders()
    assert.equal((await notify(id, 'POST', adopter)).status, 403)
    assert.equal((await listed(id)).notifiedAt, null)
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

describe('criar campanha (POST /api/campaigns)', { skip }, () => {
  const admin = { Authorization: `Bearer ${ADMIN_KEY}` }
  const validCampaign = {
    title: '  Cirurgia do Thor  ',
    description: 'Cirurgia na pata traseira e remédios para a recuperação.',
    tag: 'Urgente',
    goal: 3500
  }

  test('cria ativa e zerada, com id a partir do título, e ela aparece primeiro na lista', async () => {
    const { status, data } = await api('/api/campaigns', { method: 'POST', body: validCampaign, headers: admin })
    assert.equal(status, 201)
    assert.match(data.id, /^cirurgia-do-thor-[0-9a-f]{6}$/)
    assert.equal(data.title, 'Cirurgia do Thor')
    assert.equal(data.tag, 'Urgente')
    assert.equal(data.goal, 3500)
    assert.equal(data.raised, 0)
    assert.equal(data.supporters, 0)
    assert.equal(data.active, true)

    const { data: lista } = await api('/api/campaigns')
    assert.equal(lista[0].id, data.id)
  })

  test('etiqueta é opcional; vazia vira null', async () => {
    const { status, data } = await api('/api/campaigns', {
      method: 'POST',
      body: { ...validCampaign, tag: '  ' },
      headers: admin
    })
    assert.equal(status, 201)
    assert.equal(data.tag, null)
  })

  test('a campanha nova já recebe doações e a meta anda quando a doação é paga', async () => {
    const { data: campaign } = await api('/api/campaigns', { method: 'POST', body: validCampaign, headers: admin })
    const { data: donation } = await api('/api/donations', {
      method: 'POST',
      body: { campaignId: campaign.id, amount: 200 }
    })
    const { data } = await api(`/api/donations/${donation.id}`, { method: 'PATCH', body: { status: 'paid' }, headers: admin })
    assert.equal(data.campaign.raised, 200)
    assert.equal(data.campaign.supporters, 1)
  })

  test('devolve os erros de cada campo', async () => {
    const { status, data } = await api('/api/campaigns', {
      method: 'POST',
      body: { title: '', description: 'x'.repeat(301), tag: 'y'.repeat(31), goal: 10.5 },
      headers: admin
    })
    assert.equal(status, 422)
    assert.deepEqual(Object.keys(data.errors).sort(), ['description', 'goal', 'tag', 'title'])

    for (const goal of [0, -1, '1000', 10_000_001]) {
      const { status: invalid } = await api('/api/campaigns', { method: 'POST', body: { ...validCampaign, goal }, headers: admin })
      assert.equal(invalid, 422, `meta ${goal}`)
    }
  })

  test('sem login devolve 401 e não cria nada', async () => {
    const { status } = await api('/api/campaigns', { method: 'POST', body: validCampaign })
    assert.equal(status, 401)
    const { data: lista } = await api('/api/campaigns')
    assert.equal(lista.length, 3)
  })
})

describe('editar e encerrar campanha (PUT e PATCH /api/campaigns/:id)', { skip }, () => {
  const admin = { Authorization: `Bearer ${ADMIN_KEY}` }
  const edited = { title: 'Castração 2026', description: 'Agora também na zona norte.', tag: 'Saúde', goal: 9000 }
  const end = (id, headers = admin) => api(`/api/campaigns/${id}`, { method: 'PATCH', body: { active: false }, headers })

  test('busca uma campanha pelo id; inexistente devolve 404', async () => {
    const { status, data } = await api('/api/campaigns/castracao')
    assert.equal(status, 200)
    assert.equal(data.title, 'Mutirão de castração')
    assert.equal(data.active, true)
    assert.equal(data.endedAt, null)
    assert.equal((await api('/api/campaigns/nao-existe')).status, 404)
  })

  test('edita título, descrição, etiqueta e meta, sem mexer no arrecadado nem nos apoiadores', async () => {
    const { status, data } = await api('/api/campaigns/castracao', { method: 'PUT', body: edited, headers: admin })
    assert.equal(status, 200)
    assert.equal(data.title, 'Castração 2026')
    assert.equal(data.description, 'Agora também na zona norte.')
    assert.equal(data.goal, 9000)
    assert.equal(data.raised, 3150)
    assert.equal(data.supporters, 97)
  })

  test('edição valida os campos (422) e exige login (401)', async () => {
    const invalid = await api('/api/campaigns/castracao', { method: 'PUT', body: { ...edited, goal: 0, title: '' }, headers: admin })
    assert.equal(invalid.status, 422)
    assert.deepEqual(Object.keys(invalid.data.errors).sort(), ['goal', 'title'])
    assert.equal((await api('/api/campaigns/castracao', { method: 'PUT', body: edited })).status, 401)
    assert.equal((await api('/api/campaigns/nao-existe', { method: 'PUT', body: edited, headers: admin })).status, 404)
  })

  test('encerrar tira da página Doar e bloqueia novas doações, mas ela continua na lista do administrador', async () => {
    const { status, data } = await end('castracao')
    assert.equal(status, 200)
    assert.equal(data.active, false)
    assert.ok(data.endedAt)

    const { data: publicas } = await api('/api/campaigns')
    assert.deepEqual(publicas.map((campaign) => campaign.id), ['inverno-2026', 'reforma-canil'])

    const { status: doacao } = await api('/api/donations', { method: 'POST', body: { campaignId: 'castracao', amount: 50 } })
    assert.equal(doacao, 404)

    const { data: todas } = await api('/api/campaigns?all=true', { headers: admin })
    assert.deepEqual(todas.map((campaign) => campaign.id), ['inverno-2026', 'reforma-canil', 'castracao'])
  })

  test('doação pendente de uma campanha encerrada ainda pode ser marcada como paga', async () => {
    const { data: donation } = await api('/api/donations', { method: 'POST', body: { campaignId: 'castracao', amount: 100 } })
    await end('castracao')
    const { status, data } = await api(`/api/donations/${donation.id}`, { method: 'PATCH', body: { status: 'paid' }, headers: admin })
    assert.equal(status, 200)
    assert.equal(data.campaign.raised, 3250)
  })

  test('encerrar é definitivo: encerrar de novo ou editar devolve 409', async () => {
    await end('castracao')
    const again = await end('castracao')
    assert.equal(again.status, 409)
    assert.match(again.data.message, /já foi encerrada/)
    const edit = await api('/api/campaigns/castracao', { method: 'PUT', body: edited, headers: admin })
    assert.equal(edit.status, 409)
  })

  test('encerrar: corpo diferente de { active: false } 422, inexistente 404, sem login 401', async () => {
    const wrong = await api('/api/campaigns/castracao', { method: 'PATCH', body: { active: true }, headers: admin })
    assert.equal(wrong.status, 422)
    assert.equal((await end('nao-existe')).status, 404)
    assert.equal((await end('castracao', {})).status, 401)
    const { data } = await api('/api/campaigns/castracao')
    assert.equal(data.active, true)
  })

  test('a lista com as encerradas é só para o administrador', async () => {
    assert.equal((await api('/api/campaigns?all=true')).status, 401)
  })
})

describe('pedidos de adoção', { skip }, () => {
  test('cria o pedido e deixa o pet "Em processo"', async () => {
    const { status, data } = await adopt(validAdoption)
    assert.equal(status, 201)
    assert.equal(data.petId, 'thor')
    assert.equal(data.status, 'received')

    const { data: pet } = await api('/api/pets/thor')
    assert.equal(pet.status, 'reserved')

    const { rows: [saved] } = await db.query('SELECT email, phone FROM adoption_requests WHERE id = $1', [data.id])
    assert.equal(saved.email, 'ana@exemplo.com')
    assert.equal(saved.phone, '11912345678')
  })

  test('aceita o telefone com +55 ou com 0 no DDD e grava só DDD + número', async () => {
    const cases = [
      ['+55 35 99999-9999', '35999999999'],
      ['55 (35) 3471-1234', '3534711234'],
      ['035 99999-9999', '35999999999'],
      ['(35) 3471-1234', '3534711234']
    ]
    for (const [typed, stored] of cases) {
      const { status, data } = await adopt({ ...validAdoption, phone: typed })
      assert.equal(status, 201, typed)
      const { rows: [saved] } = await db.query('SELECT phone FROM adoption_requests WHERE id = $1', [data.id])
      assert.equal(saved.phone, stored, typed)
    }
  })

  test('telefone sem DDD ou com dígitos a mais continua recusado', async () => {
    for (const phone of ['99999-9999', '+1 415 555 0100 22', '(35) 99999-99999']) {
      const { status, data } = await adopt({ ...validAdoption, phone })
      assert.equal(status, 422, phone)
      assert.ok(data.errors.phone, phone)
    }
  })

  test('aceita pedido para pet já em processo', async () => {
    const { status } = await adopt({ ...validAdoption, petId: 'pipoca' })
    assert.equal(status, 201)
  })

  test('recusa pedido para pet já adotado', async () => {
    const { status, data } = await adopt({ ...validAdoption, petId: 'luna' })
    assert.equal(status, 409)
    assert.match(data.message, /Luna/)
  })

  test('pet inexistente devolve 404', async () => {
    const { status } = await adopt({ ...validAdoption, petId: 'xyz' })
    assert.equal(status, 404)
  })

  test('devolve os erros de cada campo', async () => {
    const { status, data } = await adopt({ petId: 'thor', agreeVisit: false })
    assert.equal(status, 422)
    assert.deepEqual(
      Object.keys(data.errors).sort(),
      ['agreeVisit', 'city', 'email', 'hasOtherPets', 'housing', 'name', 'phone']
    )
  })

  test('JSON inválido devolve 400', async () => {
    const { status } = await adopt('{nao é json')
    assert.equal(status, 400)
  })

  test('corpo sem application/json devolve 415', async () => {
    const { status } = await api('/api/adoptions', {
      method: 'POST',
      body: 'x',
      headers: { ...(await adopterHeaders()), 'Content-Type': 'text/plain' }
    })
    assert.equal(status, 415)
  })

  test('corpo acima do limite devolve 413', async () => {
    const { status } = await adopt({ ...validAdoption, message: 'a'.repeat(200_000) })
    assert.equal(status, 413)
  })
})

describe('usuário administrador', { skip }, () => {
  const cookieOf = (headers) => ({ Cookie: headers.get('set-cookie').split(';')[0] })
  const adminSession = async () => cookieOf((await api('/api/auth/google', { method: 'POST', body: { credential: 'google-admin' } })).headers)
  const adopterSession = async () => cookieOf((await api('/api/auth/google', { method: 'POST', body: { credential: 'google-bia' } })).headers)
  const newPet = { name: 'Rex', species: 'cao', age: '2 anos', sex: 'Macho', size: 'Porte médio', city: 'Campinas', state: 'SP' }

  test('conta do Google com e-mail em ADMIN_EMAILS é administradora', async () => {
    const { data } = await api('/api/auth/google', { method: 'POST', body: { credential: 'google-admin' } })
    assert.equal(data.user.isAdmin, true)
    const { data: me } = await api('/api/auth/me', { headers: await adminSession() })
    assert.equal(me.user.isAdmin, true)
  })

  test('administrador logado usa as rotas de administração sem a chave', async () => {
    const admin = await adminSession()
    assert.equal((await api('/api/adoptions', { headers: admin })).status, 200)
    const created = await api('/api/pets', { method: 'POST', body: newPet, headers: admin })
    assert.equal(created.status, 201)
    assert.equal((await api(`/api/pets/${created.data.id}`, { method: 'PUT', body: { ...newPet, age: '3 anos' }, headers: admin })).status, 200)
    assert.equal((await api(`/api/pets/${created.data.id}`, { method: 'DELETE', headers: admin })).status, 200)
  })

  test('adotante logado recebe 403 e não altera nada', async () => {
    const adopter = await adopterSession()
    const { data: me } = await api('/api/auth/me', { headers: adopter })
    assert.equal(me.user.isAdmin, false)

    const list = await api('/api/adoptions', { headers: adopter })
    assert.equal(list.status, 403)
    assert.equal(list.data.message, 'Esta área é só para administradores.')
    assert.equal((await api('/api/pets', { method: 'POST', body: newPet, headers: adopter })).status, 403)
    assert.equal((await api('/api/pets/thor', { method: 'DELETE', headers: adopter })).status, 403)
    assert.equal((await api('/api/pets/thor')).status, 200)
  })

  test('conta só com senha usando o e-mail de administrador NÃO vira administradora', async () => {
    const { data, headers } = await api('/api/auth/register', {
      method: 'POST',
      body: { name: 'Impostor', email: 'admin@exemplo.com', password: 'senha-forte-123', confirmPassword: 'senha-forte-123' }
    })
    assert.equal(data.user.isAdmin, false)
    assert.equal((await api('/api/adoptions', { headers: cookieOf(headers) })).status, 403)
  })

  test('sem login: 401; a chave ADMIN_API_KEY continua valendo fora do site', async () => {
    assert.equal((await api('/api/adoptions')).status, 401)
    assert.equal((await api('/api/adoptions', { headers: { Authorization: `Bearer ${ADMIN_KEY}` } })).status, 200)
  })
})

describe('lista de doações (GET /api/donations)', { skip }, () => {
  const admin = { Authorization: `Bearer ${ADMIN_KEY}` }
  const donate = (campaignId, amount) => api('/api/donations', { method: 'POST', body: { campaignId, amount } })

  test('lista as doações com o nome da campanha, mais recentes primeiro', async () => {
    await donate('castracao', 50)
    await donate(null, 30)

    const { status, data } = await api('/api/donations', { headers: admin })
    assert.equal(status, 200)
    assert.equal(data.length, 2)
    assert.deepEqual(
      data.map((donation) => [donation.campaignTitle, donation.amount, donation.status]),
      [[null, 30, 'pending'], ['Mutirão de castração', 50, 'pending']]
    )
  })

  test('filtra por campanha, doação livre e status', async () => {
    await donate('castracao', 50)
    await donate('inverno-2026', 100)
    await donate(null, 30)

    const porCampanha = await api('/api/donations?campaignId=castracao', { headers: admin })
    assert.deepEqual(porCampanha.data.map((donation) => donation.amount), [50])
    const livres = await api('/api/donations?campaignId=livre', { headers: admin })
    assert.deepEqual(livres.data.map((donation) => donation.amount), [30])
    const pagas = await api('/api/donations?status=paid', { headers: admin })
    assert.equal(pagas.data.length, 0)
    assert.equal((await api('/api/donations?status=xyz', { headers: admin })).status, 400)
  })

  test('só administrador: 401 sem login e 403 para adotante', async () => {
    assert.equal((await api('/api/donations')).status, 401)
    const { headers } = await api('/api/auth/google', { method: 'POST', body: { credential: 'google-bia' } })
    const adopter = { Cookie: headers.get('set-cookie').split(';')[0] }
    assert.equal((await api('/api/donations', { headers: adopter })).status, 403)
  })

  test('doar continua aberto para qualquer visitante', async () => {
    const { status } = await donate('castracao', 20)
    assert.equal(status, 201)
  })
})

describe('marcar doação como paga (PATCH /api/donations/:id)', { skip }, () => {
  const admin = { Authorization: `Bearer ${ADMIN_KEY}` }
  const donate = async (campaignId, amount) =>
    (await api('/api/donations', { method: 'POST', body: { campaignId, amount } })).data.id
  const markPaid = (id, headers = admin, status = 'paid') => api(`/api/donations/${id}`, { method: 'PATCH', body: { status }, headers })
  const campaign = async (id) => (await api('/api/campaigns')).data.find((item) => item.id === id)

  test('marca como paga e soma o valor e um apoiador na meta da campanha', async () => {
    const before = await campaign('castracao')
    const id = await donate('castracao', 100)
    // Pendente ainda não entra na meta.
    assert.equal((await campaign('castracao')).raised, before.raised)

    const { status, data } = await markPaid(id)
    assert.equal(status, 200)
    assert.deepEqual(data.donation, { id, status: 'paid', amount: 100, previousStatus: 'pending' })
    assert.equal(data.campaign.raised, before.raised + 100)

    const after = await campaign('castracao')
    assert.equal(after.raised, before.raised + 100)
    assert.equal(after.supporters, before.supporters + 1)
  })

  test('doação livre muda para paga sem mexer em campanha', async () => {
    const id = await donate(null, 30)
    const { status, data } = await markPaid(id)
    assert.equal(status, 200)
    assert.equal(data.campaign, null)
  })

  test('marcar de novo responde 409 e não soma duas vezes', async () => {
    const before = await campaign('inverno-2026')
    const id = await donate('inverno-2026', 50)
    await markPaid(id)
    const { status, data } = await markPaid(id)
    assert.equal(status, 409)
    assert.match(data.message, /já está paga/)
    assert.equal((await campaign('inverno-2026')).raised, before.raised + 50)
  })

  test('status inválido 422, doação inexistente 404, sem permissão 401', async () => {
    const id = await donate('castracao', 10)
    assert.equal((await markPaid(id, admin, 'pending')).status, 422)
    assert.equal((await markPaid('00000000-0000-0000-0000-000000000000')).status, 404)
    assert.equal((await markPaid('nao-e-uuid')).status, 404)
    assert.equal((await markPaid(id, {})).status, 401)
    const { data } = await api('/api/donations?status=pending', { headers: admin })
    assert.ok(data.some((donation) => donation.id === id))
  })
})

describe('cancelar doação (PATCH /api/donations/:id { status: canceled })', { skip }, () => {
  const admin = { Authorization: `Bearer ${ADMIN_KEY}` }
  const donate = async (campaignId, amount) =>
    (await api('/api/donations', { method: 'POST', body: { campaignId, amount } })).data.id
  const setStatus = (id, status, headers = admin) => api(`/api/donations/${id}`, { method: 'PATCH', body: { status }, headers })
  const campaign = async (id) => (await api('/api/campaigns')).data.find((item) => item.id === id)

  test('cancelar pendente não mexe na meta', async () => {
    const before = await campaign('castracao')
    const id = await donate('castracao', 100)
    const { status, data } = await setStatus(id, 'canceled')
    assert.equal(status, 200)
    assert.equal(data.donation.status, 'canceled')
    assert.equal(data.campaign, null)
    const after = await campaign('castracao')
    assert.equal(after.raised, before.raised)
    assert.equal(after.supporters, before.supporters)
  })

  test('cancelar paga (estorno) tira o valor e o apoiador da meta', async () => {
    const before = await campaign('castracao')
    const id = await donate('castracao', 100)
    await setStatus(id, 'paid')
    const { status, data } = await setStatus(id, 'canceled')
    assert.equal(status, 200)
    assert.equal(data.donation.previousStatus, 'paid')
    assert.equal(data.campaign.raised, before.raised)
    const after = await campaign('castracao')
    assert.equal(after.raised, before.raised)
    assert.equal(after.supporters, before.supporters)
  })

  test('cancelada é definitiva: não cancela de novo nem vira paga (409)', async () => {
    const id = await donate(null, 30)
    await setStatus(id, 'canceled')
    assert.equal((await setStatus(id, 'canceled')).status, 409)
    const { status, data } = await setStatus(id, 'paid')
    assert.equal(status, 409)
    assert.match(data.message, /já está cancelada/)
  })

  test('meta nunca fica negativa', async () => {
    const id = await donate('reforma-canil', 500)
    await setStatus(id, 'paid')
    await db.query("UPDATE campaigns SET raised = 100, supporters = 0 WHERE id = 'reforma-canil'")
    const { data } = await setStatus(id, 'canceled')
    assert.equal(data.campaign.raised, 0)
    assert.equal(data.campaign.supporters, 0)
  })

  test('sem login: 401', async () => {
    const id = await donate(null, 10)
    assert.equal((await setStatus(id, 'canceled', {})).status, 401)
  })
})
