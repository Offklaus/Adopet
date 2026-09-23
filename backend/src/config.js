import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url))

const envFile = resolve(ROOT_DIR, '.env')
if (existsSync(envFile)) process.loadEnvFile(envFile)

export const config = {
  port: Number(process.env.PORT ?? 3333),
  host: process.env.HOST ?? 'localhost',
  databaseUrl: process.env.DATABASE_URL,
  testDatabaseUrl: process.env.TEST_DATABASE_URL,
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

/** Encerra com uma mensagem clara quando DATABASE_URL não foi configurada. */
export function requireDatabaseUrl() {
  if (!config.databaseUrl) {
    console.error('DATABASE_URL não configurada. Copie backend/.env.example para backend/.env e preencha a senha do Postgres.')
    process.exit(1)
  }
  return config.databaseUrl
}
