/** Erro com status HTTP; vira { message, errors? } na resposta. */
export class HttpError extends Error {
  constructor(status, message, errors) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.errors = errors
  }
}

export function sendJson(res, status, data, headers = {}) {
  const body = data === undefined ? '' : JSON.stringify(data)
  res.writeHead(status, {
    ...headers,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  })
  res.end(body)
}

/** Resposta binária (ex.: foto), com os cabeçalhos do handler. */
export function sendBinary(res, status, buffer, headers = {}) {
  res.writeHead(status, { ...headers, 'Content-Length': buffer.length })
  res.end(buffer)
}

/** Lê o corpo inteiro como Buffer, com limite de tamanho. */
export async function readBody(req, { limit, tooLargeMessage = 'Corpo da requisição muito grande.' }) {
  const chunks = []
  let size = 0
  let tooLarge = false
  // Lê até o fim mesmo acima do limite, para a resposta de erro chegar ao cliente.
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) tooLarge = true
    else chunks.push(chunk)
  }
  if (tooLarge) throw new HttpError(413, tooLargeMessage)
  return Buffer.concat(chunks)
}

/** Lê o corpo como JSON, com limite de tamanho. */
export async function readJson(req, { limit = 100_000 } = {}) {
  const contentType = req.headers['content-type'] ?? ''
  if (!contentType.includes('application/json')) {
    throw new HttpError(415, 'Envie o corpo como application/json.')
  }

  const body = await readBody(req, { limit })
  try {
    return JSON.parse(body.toString('utf8') || 'null')
  } catch {
    throw new HttpError(400, 'JSON inválido.')
  }
}
