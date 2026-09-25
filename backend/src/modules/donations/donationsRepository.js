export function createDonationsRepository(db) {
  return {
    /**
     * Doações com o nome da campanha, mais recentes primeiro.
     * Filtros: status; campaignId (id da campanha ou 'livre' para doações sem campanha).
     */
    async list({ status, campaignId } = {}) {
      const where = []
      const params = []
      if (status) {
        params.push(status)
        where.push(`d.status = $${params.length}`)
      }
      if (campaignId === 'livre') {
        where.push('d.campaign_id IS NULL')
      } else if (campaignId) {
        params.push(campaignId)
        where.push(`d.campaign_id = $${params.length}`)
      }
      const { rows } = await db.query(
        `SELECT d.*, c.title AS campaign_title
         FROM donations d
         LEFT JOIN campaigns c ON c.id = d.campaign_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY d.created_at DESC`,
        params
      )
      return rows.map((row) => ({
        id: row.id,
        campaignId: row.campaign_id,
        campaignTitle: row.campaign_title,
        amount: row.amount,
        status: row.status,
        createdAt: row.created_at
      }))
    },

    /** Lê a doação travando a linha até o fim da transação (não pode ser marcada como paga duas vezes). */
    async findByIdForUpdate(id) {
      const { rows } = await db.query('SELECT * FROM donations WHERE id = $1 FOR UPDATE', [id])
      return rows[0] ?? null
    },

    /** status: 'paid' | 'canceled' (a rota confere quais mudanças são permitidas). */
    async setStatus(id, status) {
      await db.query('UPDATE donations SET status = $2 WHERE id = $1', [id, status])
    },

    /** Registra a doação como 'pending'; o valor só entra na meta quando o pagamento for confirmado. */
    async create({ campaignId, amount }) {
      const { rows } = await db.query(
        `INSERT INTO donations (campaign_id, amount)
         VALUES ($1, $2)
         RETURNING id, campaign_id, amount, status, created_at`,
        [campaignId, amount]
      )
      const row = rows[0]
      return {
        id: row.id,
        campaignId: row.campaign_id,
        amount: row.amount,
        status: row.status,
        createdAt: row.created_at
      }
    }
  }
}
