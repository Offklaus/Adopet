import { createServer } from 'node:http'
import { createApp } from './app.js'
import { config } from './config.js'
import { openDatabase } from './db/database.js'
import { seedIfEmpty } from './db/seed.js'

const db = openDatabase(config.dbPath)
if (seedIfEmpty(db)) console.log('Banco vazio: dados iniciais criados.')

const server = createServer(createApp({ db, corsOrigins: config.corsOrigins }))

server.listen(config.port, config.host, () => {
  console.log(`API do AdoPet em http://${config.host}:${config.port}/api`)
})

function shutdown(signal) {
  console.log(`${signal} recebido, encerrando…`)
  server.close(() => {
    db.close()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
