function toRequest(row) {
  return {
    id: row.id,
    petId: row.pet_id,
    petName: row.pet_name,
    petStatus: row.pet_status,
    petPhoto: row.pet_photo,
    petPhotoAlt: row.pet_photo_alt,
    name: row.name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    housing: row.housing,
    hasOtherPets: row.has_other_pets,
    message: row.message,
    agreeVisit: row.agree_visit,
    status: row.status,
    createdAt: row.created_at
  }
}

export function createAdoptionsRepository(db) {
  return {
    /** Pedidos com o nome, a foto e a situação do animal, mais recentes primeiro. Filtros: status, petId, userId. */
    async list({ status, petId, userId } = {}) {
      const where = []
      const params = []
      if (status) {
        params.push(status)
        where.push(`r.status = $${params.length}`)
      }
      if (petId) {
        params.push(petId)
        where.push(`r.pet_id = $${params.length}`)
      }
      if (userId) {
        params.push(userId)
        where.push(`r.user_id = $${params.length}`)
      }
      const { rows } = await db.query(
        `SELECT r.*, p.name AS pet_name, p.status AS pet_status, p.photo AS pet_photo, p.photo_alt AS pet_photo_alt
         FROM adoption_requests r
         JOIN pets p ON p.id = r.pet_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY r.created_at DESC`,
        params
      )
      return rows.map(toRequest)
    },

    /** Lê o pedido travando a linha até o fim da transação (a decisão não pode acontecer duas vezes). */
    async findByIdForUpdate(id) {
      const { rows } = await db.query('SELECT * FROM adoption_requests WHERE id = $1 FOR UPDATE', [id])
      return rows[0] ?? null
    },

    async updateStatus(id, status) {
      await db.query('UPDATE adoption_requests SET status = $2 WHERE id = $1', [id, status])
    },

    /** Recusa os outros pedidos em aberto do mesmo pet. Devolve quantos foram recusados. */
    async rejectOpenForPet(petId, exceptId) {
      const { rowCount } = await db.query(
        `UPDATE adoption_requests SET status = 'rejected'
         WHERE pet_id = $1 AND id <> $2 AND status = 'received'`,
        [petId, exceptId]
      )
      return rowCount
    },

    /** Pedidos ainda em aberto (recebidos) para um pet. */
    async countOpenForPet(petId) {
      const { rows } = await db.query(
        `SELECT COUNT(*)::int AS total FROM adoption_requests WHERE pet_id = $1 AND status = 'received'`,
        [petId]
      )
      return rows[0].total
    },

    async create(request) {
      const { rows } = await db.query(
        `INSERT INTO adoption_requests
           (pet_id, name, email, phone, city, housing, has_other_pets, message, agree_visit, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, pet_id, status, created_at`,
        [
          request.petId,
          request.name,
          request.email,
          request.phone,
          request.city,
          request.housing,
          request.hasOtherPets,
          request.message,
          request.agreeVisit,
          // Conta de quem fez o pedido; null se a pessoa não estava logada.
          request.userId ?? null
        ]
      )
      const row = rows[0]
      return { id: row.id, petId: row.pet_id, status: row.status, createdAt: row.created_at }
    }
  }
}
