/**
 * Campanhas de exemplo usadas enquanto o backend não existe.
 * Mesmo formato que a API deve devolver em GET /campaigns.
 */
export const mockCampaigns = [
  {
    id: 'inverno-2026',
    title: 'Campanha de inverno',
    description: 'Cobertores, ração e vacinas para os 120 pets do abrigo passarem o frio bem cuidados.',
    tag: 'Campanha ativa',
    raised: 6800,
    goal: 10000,
    supporters: 214
  },
  {
    id: 'castracao',
    title: 'Mutirão de castração',
    description: 'Castração gratuita para 80 cães e gatos de famílias da zona leste.',
    tag: 'Saúde',
    raised: 3150,
    goal: 8000,
    supporters: 97
  },
  {
    id: 'reforma-canil',
    title: 'Reforma do canil',
    description: 'Novo piso e cobertura para os recintos dos cães de grande porte.',
    tag: 'Estrutura',
    raised: 12400,
    goal: 15000,
    supporters: 331
  }
]
