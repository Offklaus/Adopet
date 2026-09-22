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
  const listActiveStmt = db.prepare('SELECT * FROM campaigns WHERE active = 1 ORDER BY created_at DESC')
  const findActiveStmt = db.prepare('SELECT * FROM campaigns WHERE id = ? AND active = 1')

  return {
    /** Campanhas ativas, a mais recente primeiro (a home destaca a primeira). */
    listActive() {
      return listActiveStmt.all().map(toCampaign)
    },

    findActiveById(id) {
      return toCampaign(findActiveStmt.get(id))
    }
  }
}
