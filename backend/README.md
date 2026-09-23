# AdoPet — backend

API do AdoPet em **Node.js puro** (sem framework) com **PostgreSQL**.

| Precisa de | Usa |
| --- | --- |
| Servidor HTTP | `node:http` e um roteador próprio (`src/lib/router.js`) |
| Banco de dados | PostgreSQL, pelo pacote `pg` (única dependência) |
| Variáveis de ambiente | `process.loadEnvFile` |
| Testes | `node:test` + `fetch` |

Requer **Node 20.12 ou mais novo** e **PostgreSQL 13 ou mais novo**.

## Primeira vez

1. Crie o arquivo de configuração e coloque a senha do seu usuário do Postgres nas duas URLs:
   ```bash
   cp .env.example .env
   ```
2. Instale a dependência e crie os bancos `adopet` e `adopet_test`:
   ```bash
   npm install
   npm run db:create
   ```
3. Suba a API. Na primeira execução ela cria as tabelas (migrações) e os dados de exemplo:
   ```bash
   npm run dev
   ```

| Script | O que faz |
| --- | --- |
| `npm run dev` | Sobe a API com `--watch` em http://localhost:3333/api |
| `npm start` | Sobe a API |
| `npm run db:create` | Cria os bancos de `DATABASE_URL` e `TEST_DATABASE_URL`, se não existirem |
| `npm run db:migrate` | Aplica as migrações pendentes (a API também faz isso ao subir) |
| `npm run seed` | Apaga os dados e recria os dados de exemplo |
| `npm test` | Roda os testes no banco de `TEST_DATABASE_URL` |

## Migrações

Cada mudança no banco é um arquivo em `src/db/migrations/`, numerado em ordem (`001_initial.sql`, `002_...sql`).
Cada arquivo roda uma única vez, dentro de uma transação, e fica registrado na tabela `schema_migrations`.
Para mudar o banco, **crie um arquivo novo**. Não edite uma migração que já foi aplicada.

## Estrutura

```
backend/
├── src/
│   ├── server.js            aplica migrações, sobe o servidor e encerra com segurança (Ctrl+C)
│   ├── app.js               monta as rotas; trata CORS, erros e log
│   ├── config.js            lê o .env
│   ├── lib/
│   │   ├── router.js        roteador com parâmetros (/api/pets/:id)
│   │   ├── http.js          HttpError, sendJson, readJson (limite de 100 KB)
│   │   ├── cors.js          libera só as origens de CORS_ORIGIN
│   │   └── validate.js      validações reutilizáveis
│   ├── db/
│   │   ├── pool.js          conexão com o Postgres e withTransaction()
│   │   ├── migrate.js       executor de migrações (npm run db:migrate)
│   │   ├── migrations/      001_initial.sql, ...
│   │   ├── createDatabase.js cria os bancos (npm run db:create)
│   │   ├── seed.js          dados de exemplo (npm run seed)
│   │   └── seedData.js
│   └── modules/             um módulo por recurso: repository (SQL) + routes (HTTP)
│       ├── pets/
│       ├── campaigns/
│       ├── donations/
│       └── adoptions/
└── test/api.test.js
```

## Endpoints

Todas as respostas são JSON. Erros vêm como `{ "message": "..." }` e, em validação (422), também `{ "errors": { campo: mensagem } }`.

| Método | Caminho | Descrição | Respostas |
| --- | --- | --- | --- |
| GET | `/api/health` | Verifica se a API está no ar | 200 |
| GET | `/api/pets?species=cao\|gato&q=texto` | Lista pets, mais recentes primeiro; `q` busca no nome e na cidade | 200, 400 |
| GET | `/api/pets/:id` | Um pet | 200, 404 |
| GET | `/api/campaigns` | Campanhas ativas | 200 |
| POST | `/api/donations` | `{ campaignId: string \| null, amount: inteiro em reais }` | 201, 404, 422 |
| POST | `/api/adoptions` | `{ petId, name, email, phone, city, housing, hasOtherPets, message?, agreeVisit: true }` | 201, 404, 409, 422 |

Regras de negócio:
- **Adoção:** o primeiro pedido muda o pet de `available` para `reserved` ("Em processo"). Pets `adopted` recusam pedidos (409). A linha do pet fica travada durante o pedido (`SELECT ... FOR UPDATE`), para dois pedidos simultâneos não se atrapalharem. E-mail é salvo em minúsculas e telefone só com dígitos.
- **Doação:** fica `pending`. O valor só deve entrar em `raised` da campanha quando o pagamento for confirmado (ainda não há integração de pagamento).
