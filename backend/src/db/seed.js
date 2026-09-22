import { pathToFileURL } from 'node:url'
import { config } from '../config.js'
import { openDatabase, transaction } from './database.js'
import { seedCampaigns, seedPets } from './seedData.js'

/** Apaga tudo e recria os dados iniciais. */
export function seed(db) {
  transaction(db, () => {
    db.exec('DELETE FROM adoption_requests; DELETE FROM donations; DELETE FROM pets; DELETE FROM campaigns;')

    const insertPet = db.prepare(`
      INSERT INTO pets (id, name, species, age, sex, size, location, tags, status, photo, photo_alt, story, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const pet of seedPets) {
      insertPet.run(
        pet.id, pet.name, pet.species, pet.age, pet.sex, pet.size, pet.location,
        JSON.stringify(pet.tags), pet.status, pet.photo ?? null, pet.photoAlt ?? null, pet.story, pet.createdAt
      )
    }

    const insertCampaign = db.prepare(`
      INSERT INTO campaigns (id, title, description, tag, raised, goal, supporters, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const campaign of seedCampaigns) {
      insertCampaign.run(
        campaign.id, campaign.title, campaign.description, campaign.tag,
        campaign.raised, campaign.goal, campaign.supporters, campaign.createdAt
      )
    }
  })
}

/** Popula só se o banco estiver vazio (primeira execução). */
export function seedIfEmpty(db) {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM pets').get()
  if (total > 0) return false
  seed(db)
  return true
}

// `npm run seed`: recria os dados do banco configurado em DB_PATH.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = openDatabase(config.dbPath)
  seed(db)
  db.close()
  console.log(`Banco populado: ${seedPets.length} pets, ${seedCampaigns.length} campanhas (${config.dbPath}).`)
}
