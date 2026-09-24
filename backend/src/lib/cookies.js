/** "a=1; b=2" → { a: '1', b: '2' } */
export function parseCookies(header = '') {
  const cookies = {}
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index < 1) continue
    const name = part.slice(0, index).trim()
    try {
      cookies[name] = decodeURIComponent(part.slice(index + 1).trim())
    } catch {
      // Valor mal codificado: ignora o cookie.
    }
  }
  return cookies
}

/** Monta o cabeçalho Set-Cookie. Padrão: HttpOnly, SameSite=Lax, Path=/. */
export function serializeCookie(name, value, { maxAge, httpOnly = true, sameSite = 'Lax', secure = false, path = '/' } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`]
  if (maxAge !== undefined) parts.push(`Max-Age=${Math.floor(maxAge)}`)
  if (httpOnly) parts.push('HttpOnly')
  if (secure) parts.push('Secure')
  return parts.join('; ')
}
