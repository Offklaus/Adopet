import { HttpError, readBody } from '../../lib/http.js'
import { createPhotosRepository } from './photosRepository.js'

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Tipo real da imagem pelos primeiros bytes (não confia no Content-Type nem na extensão).
 * Só JPEG, PNG e WebP: formatos que todo navegador mostra e que não executam código (SVG ficou de fora).
 */
function detectImageType(data) {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg'
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png'
  }
  if (data.length >= 12 && data.toString('latin1', 0, 4) === 'RIFF' && data.toString('latin1', 8, 12) === 'WEBP') {
    return 'image/webp'
  }
  return null
}

/** `requireAdmin(req)` vem do app.js: só o administrador envia fotos; ver é público. */
export function registerPhotosRoutes(router, db, { requireAdmin }) {
  const photos = createPhotosRepository(db)

  // POST /api/photos (administração): corpo = o arquivo da imagem, com Content-Type image/jpeg|png|webp.
  // Devolve { id, url }; a url vai no campo photo do cadastro do animal.
  router.post('/api/photos', async ({ req }) => {
    await requireAdmin(req)
    const contentType = req.headers['content-type'] ?? ''
    if (!contentType.startsWith('image/')) {
      throw new HttpError(415, 'Envie o arquivo da imagem (JPG, PNG ou WebP).')
    }
    const data = await readBody(req, {
      limit: MAX_PHOTO_BYTES,
      tooLargeMessage: `A foto pode ter até ${MAX_PHOTO_BYTES / 1024 / 1024} MB.`
    })
    if (data.length === 0) throw new HttpError(400, 'O arquivo está vazio.')

    const type = detectImageType(data)
    if (!type) throw new HttpError(415, 'Formato não aceito. Use uma imagem JPG, PNG ou WebP.')
    return { status: 201, body: await photos.create({ contentType: type, data }) }
  })

  // GET /api/photos/:id: a imagem em si. Uma foto nunca muda (trocar a foto gera outro id), então pode ficar em cache.
  router.get('/api/photos/:id', async ({ params }) => {
    const photo = UUID.test(params.id) ? await photos.findById(params.id) : null
    if (!photo) throw new HttpError(404, 'Foto não encontrada.')
    return {
      status: 200,
      body: photo.data,
      headers: {
        'Content-Type': photo.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    }
  })
}
