import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'adopet-theme'

function readInitialTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/** Tema claro/escuro via data-theme no <html>, lembrado no navegador. */
export function useTheme() {
  const [theme, setTheme] = useState(readInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Armazenamento indisponível (aba anônima, por exemplo): o tema só não é lembrado.
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggleTheme }
}
