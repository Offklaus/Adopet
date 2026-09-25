import { parseCookies } from '../../lib/cookies.js'
import { createSessionsRepository } from './sessionsRepository.js'

export const SESSION_COOKIE = 'adopet_session'

/** Token da sessão enviado pelo navegador no cookie (ou undefined). */
export function readSessionToken(req) {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE]
}

/**
 * Acrescenta isAdmin ao usuário. Administrador = e-mail em ADMIN_EMAILS **e** conta ligada ao Google
 * (o Google confirmou que o e-mail é da pessoa; contas só com senha não têm o e-mail confirmado).
 */
export function withRole(user, adminEmails = []) {
  if (!user) return null
  return { ...user, isAdmin: user.hasGoogle && adminEmails.includes(user.email) }
}

/** Devolve uma função (req) => usuário logado (com isAdmin) ou null, para qualquer rota usar. */
export function createCurrentUser(pool, { adminEmails = [] } = {}) {
  const sessions = createSessionsRepository(pool)
  return async (req) => {
    const token = readSessionToken(req)
    return token ? withRole(await sessions.findUser(token), adminEmails) : null
  }
}
