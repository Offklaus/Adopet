import { createHash, randomBytes } from 'node:crypto'
import { toUser } from './usersRepository.js'

const hashToken = (token) => createHash('sha256').update(token).digest('hex')

export function createSessionsRepository(db) {
  return {
    /** Cria a sessão e devolve o token (vai só para o cookie; o banco guarda o hash). */
    async create(userId, days) {
      const token = randomBytes(32).toString('base64url')
      await db.query(
        `INSERT INTO sessions (token_hash, user_id, expires_at)
         VALUES ($1, $2, now() + make_interval(days => $3))`,
        [hashToken(token), userId, days]
      )
      return token
    },

    /** Usuário dono de uma sessão ainda válida, ou null. */
    async findUser(token) {
      const { rows } = await db.query(
        `SELECT u.* FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [hashToken(token)]
      )
      return toUser(rows[0])
    },

    async remove(token) {
      await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)])
    }
  }
}
