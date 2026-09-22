import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url))

const envFile = resolve(ROOT_DIR, '.env')
if (existsSync(envFile)) process.loadEnvFile(envFile)

const dbPath = process.env.DB_PATH ?? 'data/adopet.db'

export const config = {
  port: Number(process.env.PORT ?? 3333),
  host: process.env.HOST ?? 'localhost',
  dbPath: dbPath === ':memory:' ? dbPath : resolve(ROOT_DIR, dbPath),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}
