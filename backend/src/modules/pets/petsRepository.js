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
    tags: JSON.parse(row.tags),
    status: row.status,
    photo: row.photo,
    photoAlt: row.photo_alt,
    story: row.story,
    createdAt: row.created_at
  }
}

export function createPetsRepository(db) {
  const findByIdStmt = db.prepare('SELECT * FROM pets WHERE id = ?')
  const updateStatusStmt = db.prepare('UPDATE pets SET status = ? WHERE id = ?')

  return {
    /** Filtros opcionais: species ('cao' | 'gato') e q (nome ou cidade). Mais recentes primeiro. */
    list({ species, q } = {}) {
      const where = []
      const params = []
      if (species) {
        where.push('species = ?')
        params.push(species)
      }
      if (q) {
        const term = `%${escapeLike(q)}%`
        where.push("(name LIKE ? ESCAPE '\\' OR location LIKE ? ESCAPE '\\')")
        params.push(term, term)
      }
      const sql = `SELECT * FROM pets ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC`
      return db.prepare(sql).all(...params).map(toPet)
    },

    findById(id) {
      return toPet(findByIdStmt.get(id))
    },

    updateStatus(id, status) {
      updateStatusStmt.run(status, id)
    }
  }
}
