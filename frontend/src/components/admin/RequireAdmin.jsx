import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LoadingState } from '../feedback/LoadingState'
import { Button } from '../ui'

/**
 * Rota-pai de /admin/*: só mostra as páginas de administração para o administrador logado.
 * A proteção de verdade é a da API (401/403); aqui é para a pessoa entender o que fazer.
 */
export function RequireAdmin() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingState />

  if (!user) {
    return (
      <section className="section section--tight">
        <div className="form-card auth-card">
          <h1 className="t-heading-lg">Área administrativa</h1>
          <p className="t-muted" style={{ margin: 0 }}>Entre com a conta de administrador para continuar.</p>
          <div>
            <Button to={`/entrar?voltar=${encodeURIComponent(location.pathname + location.search)}`}>Entrar</Button>
          </div>
        </div>
      </section>
    )
  }

  if (!user.isAdmin) {
    return (
      <section className="section section--tight">
        <div className="form-card auth-card">
          <h1 className="t-heading-lg">Acesso restrito</h1>
          <p className="t-muted" style={{ margin: 0 }}>
            Esta área é só para administradores. Você está conectado como {user.email}.
          </p>
          <div>
            <Button variant="outline" to="/">Voltar ao início</Button>
          </div>
        </div>
      </section>
    )
  }

  return <Outlet />
}
