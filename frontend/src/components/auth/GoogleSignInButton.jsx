import { useEffect, useRef, useState } from 'react'
import { Alert } from '../ui'

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
let scriptPromise

/** Carrega o script do Google Identity Services uma única vez. */
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = resolve
    script.onerror = () => {
      scriptPromise = undefined
      reject(new Error('Falha ao carregar o script do Google.'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Botão oficial "Continuar com o Google". Ao escolher a conta, chama
 * onCredential(idToken); quem confere o token é o backend.
 */
export function GoogleSignInButton({ clientId, onCredential, text = 'continue_with' }) {
  const containerRef = useRef(null)
  const callbackRef = useRef(onCredential)
  callbackRef.current = onCredential
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!clientId) return undefined
    let cancelled = false
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => callbackRef.current(response.credential)
        })
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: document.documentElement.dataset.theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text,
          locale: 'pt-BR',
          width: Math.min(Math.max(containerRef.current.offsetWidth, 200), 400)
        })
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [clientId, text])

  if (!clientId) {
    return (
      <p className="t-body-sm t-muted auth-google-off">
        Entrar com o Google ainda não está disponível (falta configurar o GOOGLE_CLIENT_ID no backend).
      </p>
    )
  }
  if (failed) {
    return <Alert tone="warning" title="Não foi possível carregar o botão do Google">Verifique sua conexão e recarregue a página.</Alert>
  }
  return <div ref={containerRef} className="auth-google" />
}
