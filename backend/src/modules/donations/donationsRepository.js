import { randomUUID } from 'node:crypto'

export function createDonationsRepository(db) {
  const insertStmt = db.prepare(`
    INSERT INTO donations (id, campaign_id, amount)
    VALUES (?, ?, ?)
    RETURNING id, campaign_id, amount, status, created_at
  `)

  return {
    /** Registra a doação como 'pending'; o valor só entra na meta quando o pagamento for confirmado. */
    create({ campaignId, amount }) {
      const row = insertStmt.get(randomUUID(), campaignId, amount)
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
