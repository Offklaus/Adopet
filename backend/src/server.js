import { createServer } from 'node:http'
import { createApp } from './app.js'
import { config, requireDatabaseUrl } from './config.js'
import { migrate } from './db/migrate.js'
import { createPool, describeConnectionError } from './db/pool.js'
import { seedIfEmpty } from './db/seed.js'

const pool = createPool(requireDatabaseUrl())

try {
  const applied = await migrate(pool)
  if (applied.length) console.log(`Migrações aplicadas: ${applied.join(', ')}`)
  if (await seedIfEmpty(pool)) console.log('Banco vazio: dados iniciais criados.')
} catch (error) {
  console.error(describeConnectionError(error))
  await pool.end()
  process.exit(1)
}

const server = createServer(createApp({ db: pool, corsOrigins: config.corsOrigins }))

server.on('error', async (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `A porta ${config.port} já está em uso: provavelmente outra cópia da API está rodando.\n` +
        'Feche o outro terminal (Ctrl+C) ou mude PORT no backend/.env.'
    )
  } else {
    console.error('Não foi possível iniciar a API:', error)
  }
  await pool.end()
  process.exit(1)
})

server.listen(config.port, config.host, () => {
  console.log(`API do AdoPet em http://${config.host}:${config.port}/api`)
})

function shutdown(signal) {
  console.log(`${signal} recebido, encerrando…`)
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
