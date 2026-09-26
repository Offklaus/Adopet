/**
 * Telefone brasileiro só com DDD + número (10 ou 11 dígitos), aceitando como as pessoas digitam:
 * "(35) 99999-9999", "+55 35 99999-9999" (tira o 55) e "035 99999-9999" (tira o 0 do DDD).
 * Devolve null se não for um telefone válido. Mesma regra do backend (src/lib/validate.js).
 */
export function normalizePhone(value) {
  let digits = String(value ?? '').replace(/\D/g, '')
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2)
  else if ((digits.length === 11 || digits.length === 12) && digits.startsWith('0')) digits = digits.slice(1)
  return digits.length === 10 || digits.length === 11 ? digits : null
}
