const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0
})

/** Valores em reais, sem centavos: formatBRL(50) → "R$ 50". */
export function formatBRL(value) {
  return formatter.format(value ?? 0)
}
