import { randomBytes } from 'node:crypto'

/** "Pé de Pano" → "pe-de-pano-3f9a1c": id legível na URL e sem colisão. */
export function makeId(text, fallback) {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .replace(/-$/, '')
  return `${slug || fallback}-${randomBytes(3).toString('hex')}`
}
