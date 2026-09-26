/** Caminho público de uma foto enviada; é o que fica salvo em pets.photo. */
export const photoPath = (id) => `/api/photos/${id}`

const PHOTO_PATH = /^\/api\/photos\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/** Id da foto enviada a partir de pets.photo, ou null se for um link externo (ou vazio). */
export function photoIdFrom(photo) {
  return typeof photo === 'string' ? (PHOTO_PATH.exec(photo)?.[1] ?? null) : null
}

export function createPhotosRepository(db) {
  return {
    async create({ contentType, data }) {
      const { rows } = await db.query(
        'INSERT INTO pet_photos (content_type, data, size) VALUES ($1, $2, $3) RETURNING id, content_type, size',
        [contentType, data, data.length]
      )
      return { id: rows[0].id, url: photoPath(rows[0].id), contentType: rows[0].content_type, size: rows[0].size }
    },

    async findById(id) {
      const { rows } = await db.query('SELECT content_type, data FROM pet_photos WHERE id = $1', [id])
      return rows[0] ? { contentType: rows[0].content_type, data: rows[0].data } : null
    },

    async exists(id) {
      const { rowCount } = await db.query('SELECT 1 FROM pet_photos WHERE id = $1', [id])
      return rowCount > 0
    },

    /** Apaga a foto enviada se nenhum pet usa mais esse endereço (troca de foto ou pet excluído). */
    async removeIfUnused(photo) {
      const id = photoIdFrom(photo)
      if (!id) return
      await db.query(
        'DELETE FROM pet_photos WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM pets WHERE photo = $2)',
        [id, photoPath(id)]
      )
    }
  }
}
