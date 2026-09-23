export function createDonationsRepository(db) {
  return {
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
