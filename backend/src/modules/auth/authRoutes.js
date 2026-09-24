import { parseCookies, serializeCookie } from '../../lib/cookies.js'
import { InvalidGoogleTokenError, verifyGoogleIdToken } from '../../lib/google.js'
import { HttpError, readJson } from '../../lib/http.js'
import { hashPassword, verifyPassword } from '../../lib/password.js'
import { assertBodyIsObject, assertValid, isEmail, requiredText } from '../../lib/validate.js'
import { createSessionsRepository } from './sessionsRepository.js'
import { createUsersRepository, toUser } from './usersRepository.js'

const SESSION_COOKIE = 'adopet_session'
const SESSION_DAYS = 30
const PASSWORD_MIN = 8
const PASSWORD_MAX = 128
// Bloqueio de login depois de muitas senhas erradas para o mesmo e-mail.
const MAX_FAILED_LOGINS = 5
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000

const normalizeEmail = (email) => email.trim().toLowerCase()

export function registerAuthRoutes(router, pool, { googleClientId, cookieSecure = false, verifyGoogle = verifyGoogleIdToken } = {}) {
  const users = createUsersRepository(pool)
  const sessions = createSessionsRepository(pool)
  const failedLogins = new Map()
  // Hash de uma senha qualquer: o login confere contra ele quando o e-mail não existe,
  // para a resposta demorar o mesmo e não revelar quais e-mails têm conta.
  const dummyHash = hashPassword('senha-inexistente')

  const readToken = (req) => parseCookies(req.headers.cookie)[SESSION_COOKIE]

  async function startSession(userRow, status) {
    const token = await sessions.create(userRow.id, SESSION_DAYS)
    return {
      status,
      body: { user: toUser(userRow) },
      headers: {
        'Set-Cookie': serializeCookie(SESSION_COOKIE, token, { maxAge: SESSION_DAYS * 24 * 60 * 60, secure: cookieSecure })
      }
    }
  }

  function isLocked(email) {
    const entry = failedLogins.get(email)
    if (!entry) return false
    if (Date.now() - entry.since > FAILED_LOGIN_WINDOW_MS) {
      failedLogins.delete(email)
      return false
    }
    return entry.count >= MAX_FAILED_LOGINS
  }

  function registerFailure(email) {
    const entry = failedLogins.get(email)
    if (!entry || Date.now() - entry.since > FAILED_LOGIN_WINDOW_MS) failedLogins.set(email, { count: 1, since: Date.now() })
    else entry.count += 1
  }

  // O frontend pergunta se o "Entrar com o Google" está configurado.
  router.get('/api/auth/config', () => ({ status: 200, body: { googleClientId: googleClientId ?? null } }))

  // Quem está logado neste navegador ({ user: null } se ninguém).
  router.get('/api/auth/me', async ({ req }) => {
    const token = readToken(req)
    return { status: 200, body: { user: token ? await sessions.findUser(token) : null } }
  })

  // POST /api/auth/register  { name, email, password, confirmPassword }
  router.post('/api/auth/register', async ({ req }) => {
    const body = await readJson(req)
    assertBodyIsObject(body)
    const errors = {}
    if (!requiredText(body.name, 80)) errors.name = 'Informe seu nome.'
    if (!isEmail(body.email)) errors.email = 'Informe um e-mail válido.'
    if (typeof body.password !== 'string' || body.password.length < PASSWORD_MIN || body.password.length > PASSWORD_MAX) {
      errors.password = `A senha precisa ter entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres.`
    }
    if (body.confirmPassword !== body.password) errors.confirmPassword = 'As senhas não são iguais.'
    assertValid(errors)

    const email = normalizeEmail(body.email)
    if (await users.findRowByEmail(email)) {
      throw new HttpError(409, 'Já existe uma conta com esse e-mail. Entre com a senha ou com o Google.', {
        email: 'Já existe uma conta com esse e-mail.'
      })
    }
    try {
      const row = await users.create({ name: body.name.trim(), email, passwordHash: await hashPassword(body.password) })
      return await startSession(row, 201)
    } catch (error) {
      // Dois cadastros simultâneos com o mesmo e-mail.
      if (error.code === '23505') throw new HttpError(409, 'Já existe uma conta com esse e-mail.', { email: 'Já existe uma conta com esse e-mail.' })
      throw error
    }
  })

  // POST /api/auth/login  { email, password }
  router.post('/api/auth/login', async ({ req }) => {
    const body = await readJson(req)
    assertBodyIsObject(body)
    const errors = {}
    if (!isEmail(body.email)) errors.email = 'Informe um e-mail válido.'
    if (typeof body.password !== 'string' || !body.password) errors.password = 'Informe a senha.'
    assertValid(errors)

    const email = normalizeEmail(body.email)
    if (isLocked(email)) {
      throw new HttpError(429, 'Muitas tentativas com senha errada. Espere alguns minutos e tente de novo.')
    }
    const row = await users.findRowByEmail(email)
    const valid = await verifyPassword(body.password, row?.password_hash ?? (await dummyHash))
    if (!row || !row.password_hash || !valid) {
      registerFailure(email)
      throw new HttpError(401, 'E-mail ou senha incorretos.')
    }
    failedLogins.delete(email)
    return startSession(row, 200)
  })

  // POST /api/auth/google  { credential }: ID token devolvido pelo botão do Google.
  router.post('/api/auth/google', async ({ req }) => {
    if (!googleClientId) throw new HttpError(503, 'Entrar com o Google não está configurado: defina GOOGLE_CLIENT_ID no backend/.env.')
    const body = await readJson(req)
    assertBodyIsObject(body)

    let profile
    try {
      profile = await verifyGoogle(body.credential, { clientId: googleClientId })
    } catch (error) {
      if (error instanceof InvalidGoogleTokenError) throw new HttpError(401, 'Não foi possível confirmar a conta do Google. Tente de novo.')
      throw error
    }

    let row = await users.findRowByGoogleSub(profile.sub)
    if (!row) {
      const existing = await users.findRowByEmail(profile.email)
      // O Google confirmou que o e-mail é da pessoa: liga à conta que já existia.
      row = existing
        ? await users.linkGoogle(existing.id, profile.sub)
        : await users.create({ name: profile.name, email: profile.email, googleSub: profile.sub })
    }
    return startSession(row, 200)
  })

  router.post('/api/auth/logout', async ({ req }) => {
    const token = readToken(req)
    if (token) await sessions.remove(token)
    return {
      status: 200,
      body: { user: null },
      headers: { 'Set-Cookie': serializeCookie(SESSION_COOKIE, '', { maxAge: 0, secure: cookieSecure }) }
    }
  })
}
