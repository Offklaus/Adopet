import { createPublicKey, verify } from 'node:crypto'

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com']
// Tolerância para diferença de relógio entre este servidor e o Google.
const CLOCK_SKEW_MS = 60_000

export class InvalidGoogleTokenError extends Error {
  constructor(reason) {
    super(`Token do Google inválido: ${reason}`)
    this.name = 'InvalidGoogleTokenError'
  }
}

let cachedKeys = { keys: null, expiresAt: 0 }

/** Chaves públicas do Google, guardadas pelo tempo que o Google indica (Cache-Control). */
async function fetchGoogleKeys() {
  if (cachedKeys.keys && Date.now() < cachedKeys.expiresAt) return cachedKeys.keys
  const response = await fetch(CERTS_URL)
  if (!response.ok) throw new Error(`Não foi possível buscar as chaves do Google (${response.status}).`)
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get('cache-control') ?? '')?.[1] ?? 3600)
  const { keys } = await response.json()
  cachedKeys = { keys, expiresAt: Date.now() + maxAge * 1000 }
  return keys
}

const decodePart = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))

/**
 * Confere o ID token do "Entrar com o Google": assinatura RS256 com as chaves do Google,
 * emissor, público (nosso Client ID), validade e e-mail verificado.
 * Devolve { sub, email, name }.
 */
export async function verifyGoogleIdToken(idToken, { clientId, getKeys = fetchGoogleKeys, now = Date.now() } = {}) {
  if (typeof idToken !== 'string') throw new InvalidGoogleTokenError('ausente')
  const parts = idToken.split('.')
  if (parts.length !== 3) throw new InvalidGoogleTokenError('formato')

  let header
  let payload
  try {
    header = decodePart(parts[0])
    payload = decodePart(parts[1])
  } catch {
    throw new InvalidGoogleTokenError('formato')
  }
  if (header.alg !== 'RS256') throw new InvalidGoogleTokenError('algoritmo')

  const jwk = (await getKeys()).find((key) => key.kid === header.kid)
  if (!jwk) throw new InvalidGoogleTokenError('chave desconhecida')
  const signedData = Buffer.from(`${parts[0]}.${parts[1]}`)
  const signature = Buffer.from(parts[2], 'base64url')
  if (!verify('RSA-SHA256', signedData, createPublicKey({ key: jwk, format: 'jwk' }), signature)) {
    throw new InvalidGoogleTokenError('assinatura')
  }

  if (!ISSUERS.includes(payload.iss)) throw new InvalidGoogleTokenError('emissor')
  if (!clientId || payload.aud !== clientId) throw new InvalidGoogleTokenError('público')
  if (typeof payload.exp !== 'number' || payload.exp * 1000 + CLOCK_SKEW_MS < now) {
    throw new InvalidGoogleTokenError('expirado')
  }
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true'
  if (!payload.sub || typeof payload.email !== 'string' || !emailVerified) {
    throw new InvalidGoogleTokenError('e-mail não verificado')
  }

  const email = payload.email.toLowerCase()
  return { sub: String(payload.sub), email, name: payload.name || email.split('@')[0] }
}
