/** Dados públicos do usuário: nunca inclui o hash da senha. */
export function toUser(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    hasPassword: Boolean(row.password_hash),
    hasGoogle: Boolean(row.google_sub),
    createdAt: row.created_at
  }
}

export function createUsersRepository(db) {
  return {
    /** Linha completa (com password_hash), só para o login conferir a senha. */
    async findRowByEmail(email) {
      const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email])
      return rows[0] ?? null
    },

    async findRowByGoogleSub(sub) {
      const { rows } = await db.query('SELECT * FROM users WHERE google_sub = $1', [sub])
      return rows[0] ?? null
    },

    async create({ name, email, passwordHash = null, googleSub = null }) {
      const { rows } = await db.query(
        `INSERT INTO users (name, email, password_hash, google_sub)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, email, passwordHash, googleSub]
      )
      return rows[0]
    },

    /** Liga a conta do Google a uma conta que já existia com o mesmo e-mail. */
    // A senha antiga é apagada: o e-mail dela nunca foi confirmado, e quem criou a conta
    // antes poderia ser outra pessoa usando este e-mail. A partir daqui, vale o login do Google.
    async linkGoogle(id, sub) {
      const { rows } = await db.query(
        'UPDATE users SET google_sub = $2, password_hash = NULL WHERE id = $1 RETURNING *',
        [id, sub]
      )
      return rows[0]
    }
  }
}
