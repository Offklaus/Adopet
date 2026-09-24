import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { describe, test } from 'node:test'
import { InvalidGoogleTokenError, verifyGoogleIdToken } from '../src/lib/google.js'

// Par de chaves só do teste, no lugar das chaves do Google.
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const KID = 'chave-de-teste'
const getKeys = async () => [{ ...publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' }]
const CLIENT_ID = 'client-de-teste.apps.googleusercontent.com'
const NOW = Date.UTC(2026, 8, 24, 12, 0, 0)

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')

function makeToken(overrides = {}, { key = privateKey, kid = KID } = {}) {
  const header = encode({ alg: 'RS256', kid, typ: 'JWT' })
  const payload = encode({
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: '1234567890',
    email: 'Ana@Exemplo.com',
    email_verified: true,
    name: 'Ana Souza',
    exp: Math.floor(NOW / 1000) + 3600,
    ...overrides
  })
  const signature = sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), key).toString('base64url')
  return `${header}.${payload}.${signature}`
}

const check = (token) => verifyGoogleIdToken(token, { clientId: CLIENT_ID, getKeys, now: NOW })

describe('verifyGoogleIdToken', () => {
  test('aceita um token válido e devolve sub, e-mail em minúsculas e nome', async () => {
    assert.deepEqual(await check(makeToken()), { sub: '1234567890', email: 'ana@exemplo.com', name: 'Ana Souza' })
  })

  test('recusa assinatura de outra chave', async () => {
    const { privateKey: other } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    await assert.rejects(check(makeToken({}, { key: other })), InvalidGoogleTokenError)
  })

  test('recusa token alterado depois de assinado', async () => {
    const [header, , signature] = makeToken().split('.')
    const forged = `${header}.${encode({ iss: 'https://accounts.google.com', aud: CLIENT_ID, sub: 'x', email: 'x@x.com', email_verified: true, exp: 9e9 })}.${signature}`
    await assert.rejects(check(forged), InvalidGoogleTokenError)
  })

  test('recusa token feito para outro site (aud)', async () => {
    await assert.rejects(check(makeToken({ aud: 'outro-site' })), InvalidGoogleTokenError)
  })

  test('recusa token expirado', async () => {
    await assert.rejects(check(makeToken({ exp: Math.floor(NOW / 1000) - 3600 })), InvalidGoogleTokenError)
  })

  test('recusa e-mail não verificado e emissor errado', async () => {
    await assert.rejects(check(makeToken({ email_verified: false })), InvalidGoogleTokenError)
    await assert.rejects(check(makeToken({ iss: 'https://evil.example' })), InvalidGoogleTokenError)
  })

  test('recusa chave desconhecida e texto que não é token', async () => {
    await assert.rejects(check(makeToken({}, { kid: 'outra' })), InvalidGoogleTokenError)
    await assert.rejects(check('nao-e-um-token'), InvalidGoogleTokenError)
    await assert.rejects(check(undefined), InvalidGoogleTokenError)
  })
})
