import { HttpError } from './http.js'

export const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/** Texto obrigatório, sem espaços nas pontas e com tamanho máximo. */
export function requiredText(value, max) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max
}

export function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/**
 * Telefone brasileiro só com DDD + número (10 ou 11 dígitos), aceitando como as pessoas digitam:
 * "(35) 99999-9999", "+55 35 99999-9999" (tira o 55) e "035 99999-9999" (tira o 0 do DDD).
 * Devolve null se não for um telefone válido.
 */
export function normalizePhone(value) {
  if (typeof value !== 'string') return null
  let digits = value.replace(/\D/g, '')
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2)
  else if ((digits.length === 11 || digits.length === 12) && digits.startsWith('0')) digits = digits.slice(1)
  return digits.length === 10 || digits.length === 11 ? digits : null
}

export function isPhone(value) {
  return normalizePhone(value) !== null
}

/** Lança 422 com os erros por campo, se houver algum. */
export function assertValid(errors) {
  if (Object.keys(errors).length > 0) {
    throw new HttpError(422, 'Confira os campos destacados.', errors)
  }
}

export function assertBodyIsObject(body) {
  if (!isPlainObject(body)) throw new HttpError(400, 'O corpo deve ser um objeto JSON.')
}
