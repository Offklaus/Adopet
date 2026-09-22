/**
 * Dados de exemplo usados enquanto o backend não existe (VITE_USE_MOCKS=true).
 * Mesmo formato que a API deve devolver em GET /pets.
 */
export const mockPets = [
  {
    id: 'thor',
    name: 'Thor',
    species: 'cao',
    age: '2 anos',
    sex: 'Macho',
    size: 'Porte médio',
    location: 'São Paulo, SP',
    tags: ['Vacinado', 'Castrado', 'Dócil'],
    status: 'available',
    photo: null,
    story: 'Thor foi resgatado de uma rodovia em 2025. Adora passear, se dá bem com crianças e aprende rápido comandos simples.',
    createdAt: '2026-09-01'
  },
  {
    id: 'mel',
    name: 'Mel',
    species: 'gato',
    age: '1 ano',
    sex: 'Fêmea',
    size: 'Porte pequeno',
    location: 'Campinas, SP',
    tags: ['Vacinada', 'Castrada'],
    status: 'available',
    photo: null,
    story: 'Mel é tranquila e curiosa. Gosta de colo no fim da tarde e convive bem com outros gatos.',
    createdAt: '2026-09-05'
  },
  {
    id: 'pipoca',
    name: 'Pipoca',
    species: 'cao',
    age: '4 meses',
    sex: 'Fêmea',
    size: 'Porte pequeno',
    location: 'Santo André, SP',
    tags: ['Filhote', 'Vacinada'],
    status: 'reserved',
    photo: null,
    story: 'Pipoca chegou ao abrigo com os irmãos. É brincalhona e cheia de energia; vai precisar de espaço para correr.',
    createdAt: '2026-09-10'
  },
  {
    id: 'nino',
    name: 'Nino',
    species: 'gato',
    age: '5 anos',
    sex: 'Macho',
    size: 'Porte médio',
    location: 'São Paulo, SP',
    tags: ['Vacinado', 'Castrado'],
    status: 'available',
    photo: null,
    story: 'Nino é um gato adulto calmo, ideal para apartamento. Passa o dia na janela observando o movimento.',
    createdAt: '2026-08-20'
  },
  {
    id: 'bento',
    name: 'Bento',
    species: 'cao',
    age: '7 anos',
    sex: 'Macho',
    size: 'Porte grande',
    location: 'Guarulhos, SP',
    tags: ['Vacinado', 'Castrado', 'Idoso'],
    status: 'available',
    photo: null,
    story: 'Bento é um senhor carinhoso que só quer companhia e um quintal para tomar sol.',
    createdAt: '2026-08-12'
  },
  {
    id: 'luna',
    name: 'Luna',
    species: 'gato',
    age: '3 anos',
    sex: 'Fêmea',
    size: 'Porte pequeno',
    location: 'Osasco, SP',
    tags: ['Vacinada', 'Castrada'],
    status: 'adopted',
    photo: null,
    story: 'Luna encontrou um lar em setembro de 2026.',
    createdAt: '2026-07-30'
  }
]
