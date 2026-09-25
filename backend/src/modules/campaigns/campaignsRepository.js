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
    createdAt: row.created_at
  }
}

export function createCampaignsRepository(db) {
  return {
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
