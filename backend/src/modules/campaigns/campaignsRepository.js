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

    async findActiveById(id) {
      const { rows } = await db.query('SELECT * FROM campaigns WHERE id = $1 AND active', [id])
      return toCampaign(rows[0])
    }
  }
}
