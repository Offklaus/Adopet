import { useCallback, useState } from 'react'

const STORAGE_KEY = 'adopet-admin-key'

function readSavedKey() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

/**
 * Chave de administrador (ADMIN_API_KEY) digitada nas páginas de administração.
 * Com "lembrar", fica no sessionStorage até a aba fechar; nunca vai para o código do site.
 */
export function useAdminKey() {
  const [adminKey, setAdminKey] = useState(readSavedKey)
  const [remember, setRemember] = useState(() => readSavedKey() !== '')

  const persist = useCallback(() => {
    try {
      if (remember && adminKey.trim()) sessionStorage.setItem(STORAGE_KEY, adminKey.trim())
      else sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Armazenamento indisponível: a chave só não é lembrada.
    }
  }, [adminKey, remember])

  return { adminKey, setAdminKey, remember, setRemember, persist }
}
