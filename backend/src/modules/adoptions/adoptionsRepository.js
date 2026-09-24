function toRequest(row) {
  return {
    id: row.id,
    petId: row.pet_id,
    petName: row.pet_name,
    petStatus: row.pet_status,
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
    /** Pedidos com o nome e a situação do animal, mais recentes primeiro. Filtros: status, petId. */
    async list({ status, petId } = {}) {
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
      const { rows } = await db.query(
        `SELECT r.*, p.name AS pet_name, p.status AS pet_status
         FROM adoption_requests r
         JOIN pets p ON p.id = r.pet_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY r.created_at DESC`,
        params
      )
      return rows.map(toRequest)
    },

    async create(request) {
      const { rows } = await db.query(
        `INSERT INTO adoption_requests
           (pet_id, name, email, phone, city, housing, has_other_pets, message, agree_visit)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
          request.agreeVisit
        ]
      )
      const row = rows[0]
      return { id: row.id, petId: row.pet_id, status: row.status, createdAt: row.created_at }
    }
  }
}
