import { applyCors } from './lib/cors.js'
import { HttpError, sendJson } from './lib/http.js'
import { Router } from './lib/router.js'
import { registerAdoptionsRoutes } from './modules/adoptions/adoptionsRoutes.js'
import { registerAuthRoutes } from './modules/auth/authRoutes.js'
import { registerCampaignsRoutes } from './modules/campaigns/campaignsRoutes.js'
import { registerDonationsRoutes } from './modules/donations/donationsRoutes.js'
import { registerPetsRoutes } from './modules/pets/petsRoutes.js'

/**
 * Monta o handler HTTP da API. Separado do server.js para os testes
 * subirem a mesma aplicação com um banco em memória.
 */
export function createApp({
  db,
  corsOrigins = [],
  adminApiKey,
  googleClientId,
  cookieSecure = false,
  // Os testes trocam a verificação do Google por uma falsa (sem chamar o Google).
  verifyGoogle,
  log = console.log
}) {
  const router = new Router()
  router.get('/api/health', () => ({ status: 200, body: { status: 'ok' } }))
  registerPetsRoutes(router, db, { adminApiKey })
  registerCampaignsRoutes(router, db)
  registerDonationsRoutes(router, db)
  registerAdoptionsRoutes(router, db, { adminApiKey })
  registerAuthRoutes(router, db, { googleClientId, cookieSecure, ...(verifyGoogle && { verifyGoogle }) })

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
      const { handler, params } = router.match(req.method, url.pathname)
      const { status, body, headers } = await handler({ req, params, query: url.searchParams })
      sendJson(res, status, body, headers)
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
