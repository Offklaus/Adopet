import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')

/** Abre (ou cria) o banco SQLite e aplica o esquema. Use ':memory:' nos testes. */
export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })

  const db = new DatabaseSync(path)
  db.exec('PRAGMA foreign_keys = ON;')
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL;')
  db.exec(schema)
  return db
}

/** Executa `fn` numa transação; desfaz tudo se lançar erro. */
export function transaction(db, fn) {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
