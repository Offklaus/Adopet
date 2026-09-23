import { pathToFileURL } from 'node:url'
import { requireDatabaseUrl } from '../config.js'
import { migrate } from './migrate.js'
import { createPool, describeConnectionError, withTransaction } from './pool.js'
import { seedCampaigns, seedPets } from './seedData.js'

/** Apaga tudo e recria os dados iniciais. */
export async function seed(pool) {
  await withTransaction(pool, async (client) => {
    await client.query('TRUNCATE adoption_requests, donations, pets, campaigns')

    for (const pet of seedPets) {
      await client.query(
        `INSERT INTO pets (id, name, species, age, sex, size, location, tags, status, photo, photo_alt, story, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          pet.id, pet.name, pet.species, pet.age, pet.sex, pet.size, pet.location,
          pet.tags, pet.status, pet.photo ?? null, pet.photoAlt ?? null, pet.story, pet.createdAt
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

/** Popula só se o banco estiver vazio (primeira execução). */
export async function seedIfEmpty(pool) {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM pets')
  if (rows[0].total > 0) return false
  await seed(pool)
  return true
}

// `npm run seed`: recria os dados do banco de DATABASE_URL.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pool = createPool(requireDatabaseUrl())
  try {
    await migrate(pool)
    await seed(pool)
    console.log(`Banco populado: ${seedPets.length} pets, ${seedCampaigns.length} campanhas.`)
  } catch (error) {
    console.error(describeConnectionError(error))
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
