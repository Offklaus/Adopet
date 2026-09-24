import { randomBytes } from 'node:crypto'

const escapeLike = (text) => text.replace(/[\\%_]/g, (char) => `\\${char}`)

/** "Pé de Pano" → "pe-de-pano-3f9a1c": legível na URL e sem colisão. */
function makeId(name) {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `${slug || 'pet'}-${randomBytes(3).toString('hex')}`
}

function toPet(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    age: row.age,
    sex: row.sex,
    size: row.size,
    tags: row.tags,
    status: row.status,
    photo: row.photo,
    photoAlt: row.photo_alt,
    story: row.story,
    street: row.street,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    latitude: row.latitude,
    longitude: row.longitude,
    // Texto pronto para os cards: "São Paulo, SP".
    location: `${row.city}, ${row.state}`,
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
        where.push(`(name ILIKE $${params.length} OR city ILIKE $${params.length})`)
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

    async create(pet) {
      const { rows } = await db.query(
        `INSERT INTO pets
           (id, name, species, age, sex, size, tags, status, photo, photo_alt, story,
            street, neighborhood, city, state, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING *`,
        [
          makeId(pet.name), pet.name, pet.species, pet.age, pet.sex, pet.size, pet.tags, pet.status,
          pet.photo, pet.photoAlt, pet.story, pet.street, pet.neighborhood, pet.city, pet.state,
          pet.latitude, pet.longitude
        ]
      )
      return toPet(rows[0])
    },

    /** Substitui os dados do pet (o id e a data de cadastro não mudam). Devolve null se não existir. */
    async update(id, pet) {
      const { rows } = await db.query(
        `UPDATE pets SET
           name = $2, species = $3, age = $4, sex = $5, size = $6, tags = $7, status = $8,
           photo = $9, photo_alt = $10, story = $11, street = $12, neighborhood = $13,
           city = $14, state = $15, latitude = $16, longitude = $17
         WHERE id = $1
         RETURNING *`,
        [
          id, pet.name, pet.species, pet.age, pet.sex, pet.size, pet.tags, pet.status,
          pet.photo, pet.photoAlt, pet.story, pet.street, pet.neighborhood, pet.city, pet.state,
          pet.latitude, pet.longitude
        ]
      )
      return toPet(rows[0])
    },

    async updateStatus(id, status) {
      await db.query('UPDATE pets SET status = $1 WHERE id = $2', [status, id])
    }
  }
}
