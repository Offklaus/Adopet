const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/** Cliente HTTP único do app: JSON de ida e volta (ou um arquivo na ida), erro com status. */
export async function request(path, { method = 'GET', body, headers, signal } = {}) {
  // Arquivo (ex.: foto) vai cru, com o tipo dele; o resto vai como JSON.
  const isFile = body instanceof Blob
  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': isFile ? body.type : 'application/json' }),
        ...headers
      },
      body: body === undefined ? undefined : isFile ? body : JSON.stringify(body)
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('Sem conexão com o servidor. Verifique se a API está rodando.', 0)
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    throw new ApiError(payload?.message ?? 'Não foi possível completar a ação.', response.status, payload)
  }
  return payload
}
