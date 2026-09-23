import { createHash, timingSafeEqual } from 'node:crypto'
import { HttpError } from './http.js'

const digest = (value) => createHash('sha256').update(value).digest()

/**
 * Exige o cabeçalho "Authorization: Bearer <ADMIN_API_KEY>" nas rotas de administração.
 * Sem ADMIN_API_KEY configurada, essas rotas ficam desligadas.
 */
export function requireAdmin(req, adminApiKey) {
  if (!adminApiKey) {
    throw new HttpError(503, 'Cadastro desativado: defina ADMIN_API_KEY no backend/.env.')
  }
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  // Compara resumos de tamanho fixo em tempo constante.
  if (!token || !timingSafeEqual(digest(token), digest(adminApiKey))) {
    throw new HttpError(401, 'Chave de administrador ausente ou inválida.')
  }
}
