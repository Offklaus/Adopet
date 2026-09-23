const escapeLike = (text) => text.replace(/[\\%_]/g, (char) => `\\${char}`)

function toPet(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    age: row.age,
    sex: row.sex,
    size: row.size,
    location: row.location,
    tags: row.tags,
    status: row.status,
    photo: row.photo,
    photoAlt: row.photo_alt,
    story: row.story,
    createdAt: row.created_at
  }
}

/** `db` é o pool ou, dentro de uma transação, o client dela. */
export function createPetsRepository(db) {
  return {
    /** Filtros opcionais: species ('cao' | 'gato') e q (nome ou cidade). Mais recentes primeiro. */
    async list({ species, q } = {}) {
      const where = []
      const params = []
      if (species) {
        params.push(species)
        where.push(`species = $${params.length}`)
      }
      if (q) {
        params.push(`%${escapeLike(q)}%`)
        where.push(`(name ILIKE $${params.length} OR location ILIKE $${params.length})`)
      }
      const { rows } = await db.query(
        `SELECT * FROM pets ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC`,
        params
      )
      return rows.map(toPet)
    },

    async findById(id) {
      const { rows } = await db.query('SELECT * FROM pets WHERE id = $1', [id])
      return toPet(rows[0])
    },

    /** Lê o pet travando a linha até o fim da transação (evita dois pedidos mudarem o status juntos). */
    async findByIdForUpdate(id) {
      const { rows } = await db.query('SELECT * FROM pets WHERE id = $1 FOR UPDATE', [id])
      return toPet(rows[0])
    },

    async updateStatus(id, status) {
      await db.query('UPDATE pets SET status = $1 WHERE id = $2', [status, id])
    }
  }
}
