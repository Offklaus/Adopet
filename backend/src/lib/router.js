import { HttpError } from './http.js'

/**
 * Roteador mínimo: caminhos com parâmetros (/api/pets/:id) e método HTTP.
 * O handler recebe { req, params, query } e devolve { status, body }.
 */
export class Router {
  #routes = []

  add(method, path, handler) {
    const keys = []
    const source = path.replace(/\/:(\w+)/g, (_, key) => {
      keys.push(key)
      return '/([^/]+)'
    })
    this.#routes.push({ method, pattern: new RegExp(`^${source}/?$`), keys, handler })
    return this
  }

  get(path, handler) {
    return this.add('GET', path, handler)
  }

  post(path, handler) {
    return this.add('POST', path, handler)
  }

  /** Devolve { handler, params } ou lança 404/405. */
  match(method, pathname) {
    const allowed = []
    for (const route of this.#routes) {
      const found = route.pattern.exec(pathname)
      if (!found) continue
      if (route.method !== method) {
        allowed.push(route.method)
        continue
      }
      const params = {}
      route.keys.forEach((key, index) => {
        try {
          params[key] = decodeURIComponent(found[index + 1])
        } catch {
          throw new HttpError(400, 'Endereço inválido.')
        }
      })
      return { handler: route.handler, params }
    }
    if (allowed.length) throw new HttpError(405, 'Método não permitido.')
    throw new HttpError(404, 'Rota não encontrada.')
  }
}
