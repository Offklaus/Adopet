import { createReadStream, existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
}

/** Arquivo do disco, se for um arquivo de verdade dentro de `root`; senão null. */
async function fileInside(root, pathname) {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const file = resolve(join(root, decoded))
  // Nada fora da pasta do site (ex.: "/..%2Fbackend/.env").
  if (file !== root && !file.startsWith(root + sep)) return null
  try {
    return (await stat(file)).isFile() ? file : null
  } catch {
    return null
  }
}

function sendFile(req, res, file, cacheControl) {
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': cacheControl
  })
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  createReadStream(file).pipe(res)
}

/**
 * Serve o site já compilado (frontend/dist) pela própria API, no mesmo endereço do /api:
 * assim o cookie de login e as fotos (/api/photos/...) funcionam sem configuração extra.
 * - arquivo que existe: o arquivo (os de assets/ têm nome com hash, então ficam em cache por 1 ano);
 * - rota do site sem extensão (/adotar, /pets/thor): index.html, e o React Router mostra a página;
 * - arquivo que não existe (/logo.png): 404.
 * Devolve null se a pasta não tem index.html (em desenvolvimento quem serve o site é o Vite).
 */
export function createStaticSite(dir) {
  const root = resolve(dir)
  const indexFile = join(root, 'index.html')
  if (!existsSync(indexFile)) return null

  return async function serveStatic(req, res, pathname) {
    const file = pathname === '/' ? indexFile : await fileInside(root, pathname)
    if (file) {
      const immutable = pathname.startsWith('/assets/')
      sendFile(req, res, file, immutable ? 'public, max-age=31536000, immutable' : 'no-cache')
      return
    }
    if (extname(pathname)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Arquivo não encontrado.')
      return
    }
    sendFile(req, res, indexFile, 'no-cache')
  }
}
