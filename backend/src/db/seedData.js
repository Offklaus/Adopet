/** Dados iniciais: os mesmos pets e campanhas que o frontend usava de exemplo. */
export const seedPets = [
  {
    id: 'thor', name: 'Thor', species: 'cao', age: '2 anos', sex: 'Macho', size: 'Porte médio',
    location: 'São Paulo, SP', tags: ['Vacinado', 'Castrado', 'Dócil'], status: 'available',
    story: 'Thor foi resgatado de uma rodovia em 2025. Adora passear, se dá bem com crianças e aprende rápido comandos simples.',
    createdAt: '2026-09-01T12:00:00Z'
  },
  {
    id: 'mel', name: 'Mel', species: 'gato', age: '1 ano', sex: 'Fêmea', size: 'Porte pequeno',
    location: 'Campinas, SP', tags: ['Vacinada', 'Castrada'], status: 'available',
    story: 'Mel é tranquila e curiosa. Gosta de colo no fim da tarde e convive bem com outros gatos.',
    createdAt: '2026-09-05T12:00:00Z'
  },
  {
    id: 'pipoca', name: 'Pipoca', species: 'cao', age: '4 meses', sex: 'Fêmea', size: 'Porte pequeno',
    location: 'Santo André, SP', tags: ['Filhote', 'Vacinada'], status: 'reserved',
    story: 'Pipoca chegou ao abrigo com os irmãos. É brincalhona e cheia de energia; vai precisar de espaço para correr.',
    createdAt: '2026-09-10T12:00:00Z'
  },
  {
    id: 'nino', name: 'Nino', species: 'gato', age: '5 anos', sex: 'Macho', size: 'Porte médio',
    location: 'São Paulo, SP', tags: ['Vacinado', 'Castrado'], status: 'available',
    story: 'Nino é um gato adulto calmo, ideal para apartamento. Passa o dia na janela observando o movimento.',
    createdAt: '2026-08-20T12:00:00Z'
  },
  {
    id: 'bento', name: 'Bento', species: 'cao', age: '7 anos', sex: 'Macho', size: 'Porte grande',
    location: 'Guarulhos, SP', tags: ['Vacinado', 'Castrado', 'Idoso'], status: 'available',
    story: 'Bento é um senhor carinhoso que só quer companhia e um quintal para tomar sol.',
    createdAt: '2026-08-12T12:00:00Z'
  },
  {
    id: 'luna', name: 'Luna', species: 'gato', age: '3 anos', sex: 'Fêmea', size: 'Porte pequeno',
    location: 'Osasco, SP', tags: ['Vacinada', 'Castrada'], status: 'adopted',
    story: 'Luna encontrou um lar em setembro de 2026.',
    createdAt: '2026-07-30T12:00:00Z'
  }
]

export const seedCampaigns = [
  {
    id: 'inverno-2026', title: 'Campanha de inverno',
    description: 'Cobertores, ração e vacinas para os 120 pets do abrigo passarem o frio bem cuidados.',
    tag: 'Campanha ativa', raised: 6800, goal: 10000, supporters: 214, createdAt: '2026-09-01T12:00:00Z'
  },
  {
    id: 'castracao', title: 'Mutirão de castração',
    description: 'Castração gratuita para 80 cães e gatos de famílias da zona leste.',
    tag: 'Saúde', raised: 3150, goal: 8000, supporters: 97, createdAt: '2026-08-15T12:00:00Z'
  },
  {
    id: 'reforma-canil', title: 'Reforma do canil',
    description: 'Novo piso e cobertura para os recintos dos cães de grande porte.',
    tag: 'Estrutura', raised: 12400, goal: 15000, supporters: 331, createdAt: '2026-07-20T12:00:00Z'
  }
]
