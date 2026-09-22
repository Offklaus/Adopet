# AdoPet — backend

API do AdoPet em **Node.js puro**: só módulos nativos, nenhuma dependência no `package.json`.

| Precisa de | Usa |
| --- | --- |
| Servidor HTTP | `node:http` |
| Banco de dados | `node:sqlite` (SQLite embutido no Node) |
| Variáveis de ambiente | `process.loadEnvFile` |
| IDs | `crypto.randomUUID` |
| Testes | `node:test` + `fetch` |

Requer **Node 22.13 ou mais novo**.

## Rodando

```bash
cd backend
cp .env.example .env    # opcional: os valores padrão já funcionam
npm run dev             # reinicia ao salvar; API em http://localhost:3333/api
```

Na primeira execução o banco (`data/adopet.db`) é criado e populado com os pets e campanhas de exemplo.

| Script | O que faz |
| --- | --- |
| `npm run dev` | Sobe a API com `--watch` |
| `npm start` | Sobe a API |
| `npm run seed` | Apaga os dados e recria os dados iniciais |
| `npm test` | Roda os testes com banco em memória |

## Estrutura

```
backend/
├── src/
│   ├── server.js            sobe o servidor HTTP e encerra com segurança (Ctrl+C)
│   ├── app.js               monta as rotas; trata CORS, erros e log
│   ├── config.js            lê o .env
│   ├── lib/
│   │   ├── router.js        roteador com parâmetros (/api/pets/:id)
│   │   ├── http.js          HttpError, sendJson, readJson (limite de 100 KB)
│   │   ├── cors.js          libera só as origens de CORS_ORIGIN
│   │   └── validate.js      validações reutilizáveis
│   ├── db/
│   │   ├── schema.sql       tabelas
│   │   ├── database.js      abre o banco e aplica o esquema; transaction()
│   │   ├── seed.js          dados iniciais (npm run seed)
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
- **Adoção:** o primeiro pedido muda o pet de `available` para `reserved` ("Em processo"). Pets `adopted` recusam pedidos (409). E-mail é salvo em minúsculas e telefone só com dígitos.
- **Doação:** fica `pending`. O valor só deve entrar em `raised` da campanha quando o pagamento for confirmado (ainda não há integração de pagamento).
