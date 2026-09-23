import pg from 'pg'
import { config, requireDatabaseUrl } from '../config.js'
import { describeConnectionError } from './pool.js'

/**
 * `npm run db:create`: cria os bancos de DATABASE_URL e TEST_DATABASE_URL
 * se ainda não existirem. Conecta no banco "postgres" com o mesmo usuário e senha.
 */
async function createDatabase(connectionString) {
  const url = new URL(connectionString)
  const name = decodeURIComponent(url.pathname.slice(1))
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`Nome de banco inválido: "${name}". Use só letras, números e _.`)
  }

  url.pathname = '/postgres'
  const client = new pg.Client({ connectionString: url.toString() })
  await client.connect()
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name])
    if (rowCount > 0) return `Banco "${name}" já existe.`
    // Nome já validado acima; CREATE DATABASE não aceita parâmetro ($1).
    await client.query(`CREATE DATABASE "${name}" ENCODING 'UTF8'`)
    return `Banco "${name}" criado.`
  } finally {
    await client.end()
  }
}

const urls = [requireDatabaseUrl(), config.testDatabaseUrl].filter(Boolean)
for (const connectionString of urls) {
  try {
    console.log(await createDatabase(connectionString))
  } catch (error) {
    console.error(describeConnectionError(error))
    process.exitCode = 1
    break
  }
}
