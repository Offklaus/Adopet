# AdoPet

Site de adoção de animais. Não há campanhas, doações nem pagamentos: nenhum dinheiro passa pelo sistema.

```
Adopet/
├── frontend/   React 18 + Vite (JavaScript)
└── backend/    Node.js puro (node:http, sem framework) + PostgreSQL
```

Na primeira vez, configure o banco seguindo [backend/README.md](backend/README.md#primeira-vez).
Depois, para rodar tudo em desenvolvimento, abra dois terminais:

```bash
cd backend && npm run dev     # API em http://localhost:3333/api
```

```bash
cd frontend && npm run dev    # site em http://localhost:5173
```

## Backend

Veja [backend/README.md](backend/README.md).

## Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev        # http://localhost:5173
npm run build      # gera frontend/dist
```

### Estrutura

```
frontend/src/
├── main.jsx                 entrada: router + estilos
├── App.jsx                  rotas
├── styles/
│   ├── tokens.css           cores, tipografia, espaço, raio, sombra (claro/escuro)
│   ├── components.css       estilos dos componentes do design system (.ap-*)
│   └── global.css           base, tipografia utilitária e layout das páginas
├── components/
│   ├── ui/                  Button, Badge, Chip, TextField, Checkbox, Alert, Stepper, Hero, Icon
│   ├── pets/                PetCard, PetGrid, PetForm
│   ├── admin/               AdminNav, RequireAdmin
│   ├── auth/                GoogleSignInButton
│   ├── layout/              Layout, Navbar, Footer, ScrollToTop
│   └── feedback/            LoadingState, ErrorState
├── pages/                   Home, Adopt, PetProfile, AdoptionForm, Login, MyAdoptions, Admin*, NotFound
├── services/                api.js (cliente HTTP) + um serviço por recurso
├── hooks/                   useAsync, useTheme
└── utils/                   cx, phone (telefone com DDD), whatsapp (aviso da decisão do pedido)
```

### Rotas

| Rota | Página |
| --- | --- |
| `/` | Home: hero, busca, pets em destaque e como funciona |
| `/adotar` | Lista com busca (`?q=`) e filtro de espécie (`?especie=cao\|gato`) |
| `/pets/:id` | Perfil do pet |
| `/pets/:id/adotar` | Formulário de adoção em 3 etapas (exige conta logada) |
| `/meus-pedidos` | Pedidos de adoção da conta logada, com a situação de cada um (link no menu "Minha conta") |
| `/entrar` | Entrar ou criar conta (e-mail e senha, ou conta do Google). `?modo=cadastro` abre em "Criar conta"; `?voltar=/caminho` volta para a página depois de entrar |
| `/admin`, `/admin/animais` | Área administrativa, **só para o administrador logado** (e-mail em `ADMIN_EMAILS` no backend, conta do Google). Link no menu "Minha conta" e no rodapé, visível só para ele |
| `/admin/animais/novo` | Cadastro de animal (só administrador) |
| `/admin/animais/:id/editar` | Edição e exclusão de um animal (só administrador) |
| `/admin/pedidos` | Pedidos de adoção com os dados de contato; aprovar ou recusar, avisar no WhatsApp e marcar o aviso (só administrador) |

### Integração com o backend

Os serviços em `src/services` chamam a API pelo `request()` de `api.js`.
Em desenvolvimento, o Vite repassa `/api/*` para o backend em `http://localhost:3333` (`vite.config.js`).
Todos os dados (animais, fotos, pedidos, contas) vêm do banco: o site precisa da API rodando.

Endpoints usados pelas páginas públicas:

| Método | Caminho | Corpo / resposta |
| --- | --- | --- |
| GET | `/api/pets?species=&q=` | lista de pets |
| GET | `/api/pets/:id` | um pet, ou 404 |
| POST | `/api/adoptions` | `{ petId, name, email, phone, city, housing, hasOtherPets, message, agreeVisit }` (com a conta logada) |

A lista completa, incluindo as rotas de administração e de contas, está no [backend/README.md](backend/README.md#endpoints).
Erros devem vir como JSON `{ "message": "..." }` com o status HTTP adequado.

### Design system

A identidade visual vem do design system AdoPet (tokens, componentes, voz e padrões de página).
Tema escuro: `data-theme="dark"` no `<html>` (botão na navbar).
Ainda não há logo oficial: a marca usa a pata + "AdoPet" em Montserrat, e os pets sem foto mostram a pata sobre fundo `primary-soft`.
