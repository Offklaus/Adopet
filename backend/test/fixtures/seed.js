import { withTransaction } from '../../src/db/pool.js'
import { seedCampaigns, seedPets } from './seedData.js'

/** Apaga tudo e recria os dados fixos. Use só no banco de testes. */
export async function seed(pool) {
  await withTransaction(pool, async (client) => {
    await client.query('TRUNCATE adoption_requests, donations, pets, pet_photos, campaigns, sessions, users')

    for (const pet of seedPets) {
      await client.query(
        `INSERT INTO pets
           (id, name, species, age, sex, size, tags, status, photo, photo_alt, story,
            street, neighborhood, city, state, latitude, longitude, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          pet.id, pet.name, pet.species, pet.age, pet.sex, pet.size, pet.tags, pet.status,
          pet.photo ?? null, pet.photoAlt ?? null, pet.story, pet.street ?? null, pet.neighborhood ?? null,
          pet.city, pet.state, pet.latitude ?? null, pet.longitude ?? null, pet.createdAt
        ]
      )
    }

    for (const campaign of seedCampaigns) {
      await client.query(
        `INSERT INTO campaigns (id, title, description, tag, raised, goal, supporters, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          campaign.id, campaign.title, campaign.description, campaign.tag,
          campaign.raised, campaign.goal, campaign.supporters, campaign.createdAt
        ]
      )
    }
  })
}
