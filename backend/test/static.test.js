import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { createApp } from '../src/app.js'

// Site compilado servido pela própria API (produção no Render). Não precisa de banco:
// nem os arquivos do site nem o 404 da API consultam o Postgres.
describe('site compilado servido pela API (frontend/dist)', () => {
  let server
  let baseUrl
  let tempDir

  before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'adopet-site-'))
    const dist = join(tempDir, 'dist')
    await mkdir(join(dist, 'assets'), { recursive: true })
    await writeFile(join(dist, 'index.html'), '<!doctype html><title>AdoPet</title><div id="root"></div>')
    await writeFile(join(dist, 'assets', 'app-abc123.js'), 'console.log("app")')
    await writeFile(join(dist, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    // Fora da pasta do site: nunca pode ser servido.
    await writeFile(join(tempDir, 'segredo.txt'), 'NAO-PODE-VAZAR')

    server = createServer(createApp({ db: null, staticDir: dist, log: () => {} }))
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    baseUrl = `http://127.0.0.1:${server.address().port}`
  })

  after(async () => {
    server?.close()
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  async function get(path, method = 'GET') {
    const response = await fetch(`${baseUrl}${path}`, { method })
    return {
      status: response.status,
      type: response.headers.get('content-type'),
      cache: response.headers.get('cache-control'),
      text: await response.text()
    }
  }

  test('a raiz e as rotas do site devolvem o index.html, sem cache', async () => {
    for (const path of ['/', '/adotar', '/pets/thor/adotar', '/admin/pedidos']) {
      const page = await get(path)
      assert.equal(page.status, 200, path)
      assert.match(page.type, /text\/html/, path)
      assert.equal(page.cache, 'no-cache', path)
      assert.match(page.text, /<title>AdoPet<\/title>/, path)
    }
  })

  test('arquivos do build têm o tipo certo; os de assets/ ficam em cache por 1 ano', async () => {
    const script = await get('/assets/app-abc123.js')
    assert.equal(script.status, 200)
    assert.match(script.type, /text\/javascript/)
    assert.equal(script.cache, 'public, max-age=31536000, immutable')

    const icon = await get('/favicon.svg')
    assert.equal(icon.status, 200)
    assert.equal(icon.type, 'image/svg+xml')
    assert.equal(icon.cache, 'no-cache')
  })

  test('arquivo que não existe dá 404; a API continua respondendo JSON', async () => {
    assert.equal((await get('/assets/nao-existe.js')).status, 404)

    const health = await get('/api/health')
    assert.equal(health.status, 200)
    assert.deepEqual(JSON.parse(health.text), { status: 'ok' })

    const missing = await get('/api/nada')
    assert.equal(missing.status, 404)
    assert.equal(JSON.parse(missing.text).message, 'Rota não encontrada.')
  })

  test('não serve nada fora da pasta do site', async () => {
    for (const path of ['/..%2Fsegredo.txt', '/%2e%2e/segredo.txt', '/assets/..%2F..%2Fsegredo.txt']) {
      const response = await get(path)
      assert.notEqual(response.status, 200, path)
      assert.doesNotMatch(response.text, /NAO-PODE-VAZAR/, path)
    }
  })

  test('HEAD não manda corpo; POST fora de /api não vira arquivo', async () => {
    const head = await get('/', 'HEAD')
    assert.equal(head.status, 200)
    assert.equal(head.text, '')

    const post = await get('/', 'POST')
    assert.equal(post.status, 404)
    assert.equal(JSON.parse(post.text).message, 'Rota não encontrada.')
  })
})

describe('sem a pasta do site (desenvolvimento)', () => {
  test('a API não serve páginas: o Vite é quem serve o site', async () => {
    const server = createServer(createApp({ db: null, staticDir: join(tmpdir(), 'adopet-nao-existe'), log: () => {} }))
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/adotar`)
      assert.equal(response.status, 404)
      assert.equal((await response.json()).message, 'Rota não encontrada.')
    } finally {
      server.close()
    }
  })
})
