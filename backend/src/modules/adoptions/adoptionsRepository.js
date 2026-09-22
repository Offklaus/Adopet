import { randomUUID } from 'node:crypto'

export function createAdoptionsRepository(db) {
  const insertStmt = db.prepare(`
    INSERT INTO adoption_requests
      (id, pet_id, name, email, phone, city, housing, has_other_pets, message, agree_visit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING id, pet_id, status, created_at
  `)

  return {
    create(request) {
      const row = insertStmt.get(
        randomUUID(),
        request.petId,
        request.name,
        request.email,
        request.phone,
        request.city,
        request.housing,
        request.hasOtherPets ? 1 : 0,
        request.message,
        request.agreeVisit ? 1 : 0
      )
      return { id: row.id, petId: row.pet_id, status: row.status, createdAt: row.created_at }
    }
  }
}
