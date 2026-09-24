import { parseCookies } from '../../lib/cookies.js'
import { createSessionsRepository } from './sessionsRepository.js'

export const SESSION_COOKIE = 'adopet_session'

/** Token da sessão enviado pelo navegador no cookie (ou undefined). */
export function readSessionToken(req) {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE]
}

/** Devolve uma função (req) => usuário logado ou null, para qualquer rota usar. */
export function createCurrentUser(pool) {
  const sessions = createSessionsRepository(pool)
  return async (req) => {
    const token = readSessionToken(req)
    return token ? sessions.findUser(token) : null
  }
}
