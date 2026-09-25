import { createHash, timingSafeEqual } from 'node:crypto'
import { HttpError } from './http.js'

const digest = (value) => createHash('sha256').update(value).digest()

/**
 * Proteção das rotas de administração. Libera quem:
 * - está logado com uma conta de administrador (site); ou
 * - envia "Authorization: Bearer <ADMIN_API_KEY>" (Postman, scripts).
 * Sem login: 401. Logado sem ser administrador: 403.
 */
export function createAdminGuard({ adminApiKey, currentUser }) {
  return async function requireAdmin(req) {
    const header = req.headers.authorization ?? ''
    if (header.startsWith('Bearer ')) {
      const token = header.slice(7).trim()
      // Compara resumos de tamanho fixo em tempo constante.
      if (adminApiKey && token && timingSafeEqual(digest(token), digest(adminApiKey))) return { via: 'api-key' }
      throw new HttpError(401, 'Chave de administrador inválida.')
    }

    const user = await currentUser(req)
    if (!user) throw new HttpError(401, 'Entre com uma conta de administrador para continuar.')
    if (!user.isAdmin) throw new HttpError(403, 'Esta área é só para administradores.')
    return { via: 'session', user }
  }
}
