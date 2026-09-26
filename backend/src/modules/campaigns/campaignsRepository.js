import { makeId } from '../../lib/slug.js'

function toCampaign(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tag: row.tag,
    raised: row.raised,
    goal: row.goal,
    supporters: row.supporters,
    active: row.active,
    createdAt: row.created_at,
    endedAt: row.ended_at
  }
}

export function createCampaignsRepository(db) {
  return {
    /** Nova campanha: começa ativa, sem nada arrecadado e sem apoiadores. */
    async create({ title, description, tag, goal }) {
      const { rows } = await db.query(
        `INSERT INTO campaigns (id, title, description, tag, goal)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [makeId(title, 'campanha'), title, description, tag, goal]
      )
      return toCampaign(rows[0])
    },

    /** Todas (administração): ativas primeiro, depois as encerradas; cada grupo da mais recente para a mais antiga. */
    async listAll() {
      const { rows } = await db.query('SELECT * FROM campaigns ORDER BY active DESC, created_at DESC')
      return rows.map(toCampaign)
    },

    async findById(id) {
      const { rows } = await db.query('SELECT * FROM campaigns WHERE id = $1', [id])
      return toCampaign(rows[0])
    },

    /** Edita título, descrição, etiqueta e meta. Só campanha ativa: devolve null se não existe ou já foi encerrada. */
    async update(id, { title, description, tag, goal }) {
      const { rows } = await db.query(
        `UPDATE campaigns SET title = $2, description = $3, tag = $4, goal = $5
         WHERE id = $1 AND active
         RETURNING *`,
        [id, title, description, tag, goal]
      )
      return toCampaign(rows[0])
    },

    /** Encerra uma campanha ativa. Devolve null se não existe ou já estava encerrada. */
    async end(id) {
      const { rows } = await db.query(
        `UPDATE campaigns SET active = false, ended_at = now()
         WHERE id = $1 AND active
         RETURNING *`,
        [id]
      )
      return toCampaign(rows[0])
    },

    /** Campanhas ativas, a mais recente primeiro (a home destaca a primeira). */
    async listActive() {
      const { rows } = await db.query('SELECT * FROM campaigns WHERE active ORDER BY created_at DESC')
      return rows.map(toCampaign)
    },

    /** Soma uma doação paga na meta: raised += valor, supporters += 1. Devolve a campanha atualizada. */
    async addDonation(id, amount) {
      const { rows } = await db.query(
        `UPDATE campaigns SET raised = raised + $2, supporters = supporters + 1
         WHERE id = $1
         RETURNING *`,
        [id, amount]
      )
      return toCampaign(rows[0])
    },

    /** Tira da meta uma doação paga que foi cancelada (estorno). Nunca deixa os totais negativos. */
    async removeDonation(id, amount) {
      const { rows } = await db.query(
        `UPDATE campaigns SET raised = GREATEST(raised - $2, 0), supporters = GREATEST(supporters - 1, 0)
         WHERE id = $1
         RETURNING *`,
        [id, amount]
      )
      return toCampaign(rows[0])
    },

    async findActiveById(id) {
      const { rows } = await db.query('SELECT * FROM campaigns WHERE id = $1 AND active', [id])
      return toCampaign(rows[0])
    }
  }
}
