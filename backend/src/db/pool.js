import pg from 'pg'

/** Pool de conexões com o Postgres. */
export function createPool(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 10 })
  // Conexão ociosa que cai (ex.: Postgres reiniciado) não deve derrubar a API.
  pool.on('error', (error) => console.error('Conexão com o Postgres perdida:', error.message))
  return pool
}

/**
 * Executa `fn(client)` numa transação: COMMIT se der certo, ROLLBACK se lançar erro.
 * Use o `client` recebido em todas as consultas da transação.
 */
export async function withTransaction(pool, fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/** Mensagem legível para os erros de conexão mais comuns. */
export function describeConnectionError(error) {
  switch (error.code) {
    case 'ECONNREFUSED':
      return 'Não foi possível conectar ao Postgres. Verifique se o serviço está rodando e a porta em DATABASE_URL.'
    case '28P01':
      return 'Usuário ou senha do Postgres incorretos em DATABASE_URL.'
    case '3D000':
      return 'O banco informado em DATABASE_URL não existe. Rode "npm run db:create".'
    default:
      return error.message
  }
}
