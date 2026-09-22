import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Volta ao topo ao trocar de página, ou rola até a âncora (#como-funciona). */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])

  return null
}
