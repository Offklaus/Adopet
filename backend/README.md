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
3. Gere a chave de administrador e coloque em `ADMIN_API_KEY` no `.env` (é ela que libera o cadastro de animais):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Suba a API. Na primeira execução ela cria as tabelas (migrações). O banco começa vazio: cadastre os animais pelo `POST /api/pets` (veja abaixo).
   ```bash
   npm run dev
   ```

| Script | O que faz |
| --- | --- |
| `npm run dev` | Sobe a API com `--watch` em http://localhost:3333/api |
| `npm start` | Sobe a API |
| `npm run db:create` | Cria os bancos de `DATABASE_URL` e `TEST_DATABASE_URL`, se não existirem |
| `npm run db:migrate` | Aplica as migrações pendentes (a API também faz isso ao subir) |
| `npm test` | Roda os testes no banco de `TEST_DATABASE_URL` (apaga e recria os dados dele) |

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
│   │   └── createDatabase.js cria os bancos (npm run db:create)
│   ├── lib/auth.js          exige a chave de administrador nas rotas de cadastro
│   └── modules/             um módulo por recurso: repository (SQL) + routes (HTTP)
│       ├── pets/
│       ├── campaigns/
│       ├── donations/
│       └── adoptions/
└── test/
    ├── api.test.js
    └── fixtures/            dados fixos usados só no banco de testes
```

## Endpoints

Todas as respostas são JSON. Erros vêm como `{ "message": "..." }` e, em validação (422), também `{ "errors": { campo: mensagem } }`.

| Método | Caminho | Descrição | Respostas |
| --- | --- | --- | --- |
| GET | `/api/health` | Verifica se a API está no ar | 200 |
| GET | `/api/pets?species=cao\|gato&q=texto` | Lista pets, mais recentes primeiro; `q` busca no nome e na cidade | 200, 400 |
| GET | `/api/pets/:id` | Um pet | 200, 404 |
| POST | `/api/pets` | Cadastra um animal (**administração**, exige `Authorization: Bearer <ADMIN_API_KEY>`) | 201, 401, 422, 503 |
| PUT | `/api/pets/:id` | Edita um animal (**administração**). Mesmo corpo e validação do POST; substitui o cadastro inteiro, mantendo `id` e data de cadastro | 200, 401, 404, 422, 503 |
| DELETE | `/api/pets/:id` | Exclui um animal (**administração**). Recusado (409) se houver pedidos de adoção para ele: nesse caso, mude a situação para `adopted` | 200, 401, 404, 409, 503 |
| GET | `/api/campaigns` | Campanhas ativas | 200 |
| POST | `/api/donations` | `{ campaignId: string \| null, amount: inteiro em reais }` | 201, 404, 422 |
| POST | `/api/adoptions` | `{ petId, name, email, phone, city, housing, hasOtherPets, message?, agreeVisit: true }` | 201, 404, 409, 422 |

### Cadastrar um animal

| Campo | Obrigatório | Valores |
| --- | --- | --- |
| `name` | sim | até 60 caracteres |
| `species` | sim | `cao` ou `gato` |
| `age` | sim | texto, ex.: `"2 anos"`, `"4 meses"` |
| `sex` | sim | `Macho` ou `Fêmea` |
| `size` | sim | `Porte pequeno`, `Porte médio` ou `Porte grande` |
| `city`, `state` | sim | cidade e UF (`SP`, `RJ`...) |
| `street`, `neighborhood` | não | rua e bairro |
| `latitude`, `longitude` | não | números; as duas juntas |
| `tags` | não | até 5 etiquetas, ex.: `["Vacinado", "Castrado"]` |
| `story` | não | história do animal, até 2.000 caracteres |
| `photo`, `photoAlt` | não | link `https://` da foto e a descrição dela |
| `status` | não | `available` (padrão), `reserved` ou `adopted` |

No PowerShell (a chave está em `ADMIN_API_KEY` no `backend/.env`):

```powershell
$body = @{
  name = 'Rex'; species = 'cao'; age = '2 anos'; sex = 'Macho'; size = 'Porte médio'
  tags = @('Vacinado', 'Castrado'); story = 'Resgatado no centro da cidade.'
  street = 'Rua das Flores, 100'; neighborhood = 'Centro'; city = 'Campinas'; state = 'SP'
  latitude = -22.9056; longitude = -47.0608
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3333/api/pets `
  -Headers @{ Authorization = 'Bearer SUA_ADMIN_API_KEY' } `
  -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
```

A resposta traz o animal cadastrado, com o `id` gerado a partir do nome (ex.: `rex-3f9a1c`).
No Postman ou Insomnia: `POST http://localhost:3333/api/pets`, aba **Auth** → **Bearer Token** com a chave, corpo **JSON** com os campos acima.

### Regras de negócio
- **Adoção:** o primeiro pedido muda o pet de `available` para `reserved` ("Em processo"). Pets `adopted` recusam pedidos (409). A linha do pet fica travada durante o pedido (`SELECT ... FOR UPDATE`), para dois pedidos simultâneos não se atrapalharem. E-mail é salvo em minúsculas e telefone só com dígitos.
- **Doação:** fica `pending`. O valor só deve entrar em `raised` da campanha quando o pagamento for confirmado (ainda não há integração de pagamento).
