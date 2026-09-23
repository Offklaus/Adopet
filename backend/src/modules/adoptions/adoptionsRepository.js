export function createAdoptionsRepository(db) {
  return {
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
