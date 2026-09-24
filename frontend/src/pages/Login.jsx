import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton'
import { Alert, Button, Checkbox, TextField } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { getAuthConfig, loginWithGoogle, loginWithPassword, registerAccount } from '../services/authService'
import { cx } from '../utils/cx'

const PASSWORD_MIN = 8
const EMPTY = { name: '', email: '', password: '', confirmPassword: '' }

/** Só volta para páginas do próprio site (evita redirecionar para outro domínio). */
function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

/** Mesmas regras do backend (authRoutes.js). */
function validate(mode, values) {
  const errors = {}
  if (mode === 'register' && !values.name.trim()) errors.name = 'Informe seu nome.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (mode === 'register') {
    if (values.password.length < PASSWORD_MIN) errors.password = `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`
    if (values.confirmPassword !== values.password) errors.confirmPassword = 'As senhas não são iguais.'
  } else if (!values.password) {
    errors.password = 'Informe a senha.'
  }
  return errors
}

export default function Login() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('modo') === 'cadastro' ? 'register' : 'login'
  const next = safeNext(searchParams.get('voltar'))
  const config = useAsync(() => getAuthConfig(), [])

  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [sending, setSending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function switchMode(nextMode) {
    const params = new URLSearchParams(searchParams)
    if (nextMode === 'register') params.set('modo', 'cadastro')
    else params.delete('modo')
    setSearchParams(params, { replace: true })
    setErrors({})
    setFeedback(null)
  }

  function setField(field) {
    return (event) => setValues((current) => ({ ...current, [field]: event.target.value }))
  }

  function handleError(error) {
    if (error.details?.errors) setErrors(error.details.errors)
    const tone = error.status === 429 ? 'warning' : 'danger'
    setFeedback({ tone, title: error.message })
  }

  function finish(loggedUser) {
    setUser(loggedUser)
    navigate(next, { replace: true })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)
    const found = validate(mode, values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSending(true)
    try {
      const data =
        mode === 'register'
          ? await registerAccount({ ...values, name: values.name.trim(), email: values.email.trim() })
          : await loginWithPassword({ email: values.email.trim(), password: values.password })
      finish(data.user)
    } catch (error) {
      handleError(error)
      setSending(false)
    }
  }

  async function handleGoogle(credential) {
    setFeedback(null)
    try {
      const data = await loginWithGoogle(credential)
      finish(data.user)
    } catch (error) {
      handleError(error)
    }
  }

  if (user) {
    return (
      <section className="section section--tight">
        <div className="form-card auth-card">
          <h1 className="t-heading-lg">Você já entrou</h1>
          <p className="t-muted" style={{ margin: 0 }}>Conectado como {user.name} ({user.email}).</p>
          <div className="row">
            <Button to="/adotar">Ver pets para adoção</Button>
            <Button variant="outline" onClick={logout}>Sair</Button>
          </div>
        </div>
      </section>
    )
  }

  const isRegister = mode === 'register'

  return (
    <section className="section section--tight">
      <form className="form-card auth-card" onSubmit={handleSubmit} noValidate>
        <div className="auth-tabs" role="tablist" aria-label="Entrar ou criar conta">
          <button type="button" role="tab" aria-selected={!isRegister} className={cx('auth-tab', !isRegister && 'is-active')} onClick={() => switchMode('login')}>
            Entrar
          </button>
          <button type="button" role="tab" aria-selected={isRegister} className={cx('auth-tab', isRegister && 'is-active')} onClick={() => switchMode('register')}>
            Criar conta
          </button>
        </div>

        <div className="stack" style={{ gap: 4 }}>
          <h1 className="t-heading-lg">{isRegister ? 'Crie sua conta' : 'Que bom ver você de novo'}</h1>
          <p className="t-muted" style={{ margin: 0 }}>
            {isRegister ? 'Com uma conta, seus pedidos de adoção ficam mais rápidos.' : 'Entre para continuar.'}
          </p>
        </div>

        {feedback && <Alert tone={feedback.tone} title={feedback.title} />}

        {!config.loading && (
          <GoogleSignInButton
            clientId={config.data?.googleClientId}
            onCredential={handleGoogle}
            text={isRegister ? 'signup_with' : 'signin_with'}
          />
        )}

        <p className="auth-divider">ou com e-mail</p>

        <div className="stack">
          {isRegister && (
            <TextField label="Nome" autoComplete="name" value={values.name} onChange={setField('name')} error={errors.name} />
          )}
          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={setField('email')}
            error={errors.email}
          />
          <TextField
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={values.password}
            onChange={setField('password')}
            error={errors.password}
            hint={isRegister ? `Pelo menos ${PASSWORD_MIN} caracteres.` : undefined}
          />
          {isRegister && (
            <TextField
              label="Confirmar senha"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={setField('confirmPassword')}
              error={errors.confirmPassword}
            />
          )}
          <Checkbox label="Mostrar senha" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
        </div>

        <Button type="submit" size="lg" full disabled={sending}>
          {sending ? 'Aguarde…' : isRegister ? 'Criar conta' : 'Entrar'}
        </Button>

        <p className="t-body-sm t-muted" style={{ margin: 0, textAlign: 'center' }}>
          {isRegister ? 'Já tem conta? ' : 'Ainda não tem conta? '}
          <button type="button" className="auth-link" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
            {isRegister ? 'Entrar' : 'Criar conta'}
          </button>
        </p>
      </form>
    </section>
  )
}
