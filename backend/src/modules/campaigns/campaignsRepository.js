import { makeId } from '../../lib/slug.js'

function toCampaign(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tag: row.tag,
    goal: row.goal,
    raised: row.raised,
    whatsapp: row.whatsapp,
    active: row.active,
    createdAt: row.created_at,
    endedAt: row.ended_at
  }
}

export function createCampaignsRepository(db) {
  return {
    /** Nova campanha: começa ativa. */
    async create({ title, description, tag, goal, raised, whatsapp }) {
      const { rows } = await db.query(
        `INSERT INTO campaigns (id, title, description, tag, goal, raised, whatsapp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [makeId(title, 'campanha'), title, description, tag, goal, raised, whatsapp]
      )
      return toCampaign(rows[0])
    },

    /** Campanhas ativas, a mais recente primeiro (páginas Doar e Home). */
    async listActive() {
      const { rows } = await db.query('SELECT * FROM campaigns WHERE active ORDER BY created_at DESC')
      return rows.map(toCampaign)
    },

    /** Todas (administração): ativas primeiro, depois as encerradas. */
    async listAll() {
      const { rows } = await db.query('SELECT * FROM campaigns ORDER BY active DESC, created_at DESC')
      return rows.map(toCampaign)
    },

    async findById(id) {
      const { rows } = await db.query('SELECT * FROM campaigns WHERE id = $1', [id])
      return toCampaign(rows[0])
    },

    /** Edita uma campanha ativa (inclusive o valor arrecadado). null se não existe ou já foi encerrada. */
    async update(id, { title, description, tag, goal, raised, whatsapp }) {
      const { rows } = await db.query(
        `UPDATE campaigns SET title = $2, description = $3, tag = $4, goal = $5, raised = $6, whatsapp = $7
         WHERE id = $1 AND active
         RETURNING *`,
        [id, title, description, tag, goal, raised, whatsapp]
      )
      return toCampaign(rows[0])
    },

    /** Encerra uma campanha ativa. null se não existe ou já estava encerrada. */
    async end(id) {
      const { rows } = await db.query(
        'UPDATE campaigns SET active = false, ended_at = now() WHERE id = $1 AND active RETURNING *',
        [id]
      )
      return toCampaign(rows[0])
    }
  }
}
