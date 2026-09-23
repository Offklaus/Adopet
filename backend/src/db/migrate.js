import { readdir, readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { requireDatabaseUrl } from '../config.js'
import { createPool, describeConnectionError } from './pool.js'

const MIGRATIONS_DIR = new URL('./migrations/', import.meta.url)
// Trava para duas instâncias não aplicarem migrações ao mesmo tempo.
const LOCK_ID = 7_272_001

/**
 * Aplica, em ordem, os arquivos de src/db/migrations que ainda não rodaram.
 * Cada arquivo roda numa transação e fica registrado em schema_migrations.
 */
export async function migrate(pool) {
  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort()
  const client = await pool.connect()
  const applied = []
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID])
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    const { rows } = await client.query('SELECT name FROM schema_migrations')
    const done = new Set(rows.map((row) => row.name))

    for (const file of files) {
      if (done.has(file)) continue
      const sql = await readFile(new URL(file, MIGRATIONS_DIR), 'utf8')
      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
        applied.push(file)
      } catch (error) {
        await client.query('ROLLBACK')
        error.message = `Migração ${file} falhou: ${error.message}`
        throw error
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {})
    client.release()
  }
  return applied
}

// `npm run db:migrate`
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pool = createPool(requireDatabaseUrl())
  try {
    const applied = await migrate(pool)
    console.log(applied.length ? `Migrações aplicadas: ${applied.join(', ')}` : 'Banco já está atualizado.')
  } catch (error) {
    console.error(describeConnectionError(error))
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
