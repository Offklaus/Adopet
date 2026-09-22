const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

/** Com VITE_USE_MOCKS=true os serviços usam os dados de src/data, sem precisar do backend. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/** Cliente HTTP único do app: JSON de ida e volta, erro com status. */
export async function request(path, { method = 'GET', body, headers, signal } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...headers
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    throw new ApiError(payload?.message ?? 'Não foi possível completar a ação.', response.status, payload)
  }
  return payload
}

/** Simula a latência da rede nos dados de exemplo. */
export function mockDelay(value, ms = 300) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}
