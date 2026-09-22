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

/** Telefone brasileiro com DDD: 10 ou 11 dígitos. */
export function isPhone(value) {
  if (typeof value !== 'string') return false
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 || digits.length === 11
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
