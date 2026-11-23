import { createAdminGuard } from './lib/auth.js'
import { applyCors } from './lib/cors.js'
import { HttpError, sendBinary, sendJson } from './lib/http.js'
import { Router } from './lib/router.js'
import { createStaticSite } from './lib/static.js'
import { registerAdoptionsRoutes } from './modules/adoptions/adoptionsRoutes.js'
import { registerAuthRoutes } from './modules/auth/authRoutes.js'
import { registerCampaignsRoutes } from './modules/campaigns/campaignsRoutes.js'
import { createCurrentUser } from './modules/auth/session.js'
import { registerPetsRoutes } from './modules/pets/petsRoutes.js'
import { registerPhotosRoutes } from './modules/photos/photosRoutes.js'

/**
 * Monta o handler HTTP da API. Separado do server.js para os testes
 * subirem a mesma aplicação com um banco em memória.
 */
export function createApp({
  db,
  corsOrigins = [],
  adminApiKey,
  // E-mails das contas administradoras (ADMIN_EMAILS), em minúsculas.
  adminEmails = [],
  googleClientId,
  cookieSecure = false,
  // Os testes trocam a verificação do Google por uma falsa (sem chamar o Google).
  verifyGoogle,
  // Pasta do site compilado (frontend/dist). Em produção a API serve o site no mesmo endereço.
  staticDir,
  log = console.log
}) {
  const router = new Router()
  const serveStatic = staticDir ? createStaticSite(staticDir) : null
  router.get('/api/health', () => ({ status: 200, body: { status: 'ok' } }))
  // Um único lugar decide quem está logado e quem é administrador; todas as rotas usam estes dois.
  const currentUser = createCurrentUser(db, { adminEmails })
  const requireAdmin = createAdminGuard({ adminApiKey, currentUser })

  registerPetsRoutes(router, db, { requireAdmin })
  registerPhotosRoutes(router, db, { requireAdmin })
  registerCampaignsRoutes(router, db, { requireAdmin })
  registerAdoptionsRoutes(router, db, { currentUser, requireAdmin })
  registerAuthRoutes(router, db, { googleClientId, cookieSecure, adminEmails, ...(verifyGoogle && { verifyGoogle }) })

  return async function handleRequest(req, res) {
    const startedAt = performance.now()
    const url = new URL(req.url, 'http://localhost')
    res.on('finish', () => {
      log(`${req.method} ${url.pathname} ${res.statusCode} ${Math.round(performance.now() - startedAt)}ms`)
    })

    applyCors(req, res, corsOrigins)
    res.setHeader('X-Content-Type-Options', 'nosniff')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    try {
      // Tudo que não é /api é o site (páginas, scripts, imagens).
      if (serveStatic && !url.pathname.startsWith('/api') && (req.method === 'GET' || req.method === 'HEAD')) {
        await serveStatic(req, res, url.pathname)
        return
      }
      const { handler, params } = router.match(req.method, url.pathname)
      const { status, body, headers } = await handler({ req, params, query: url.searchParams })
      // Buffer = arquivo (foto); o resto vai como JSON.
      if (Buffer.isBuffer(body)) sendBinary(res, status, body, headers)
      else sendJson(res, status, body, headers)
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(res, error.status, { message: error.message, ...(error.errors && { errors: error.errors }) })
        return
      }
      console.error(error)
      sendJson(res, 500, { message: 'Erro interno. Tente de novo em alguns instantes.' })
    }
  }
}
