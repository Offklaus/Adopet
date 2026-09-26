import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { Alert, Button, Checkbox, Stepper, TextField } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { createAdoptionRequest } from '../services/adoptionsService'
import { getPet } from '../services/petsService'
import { normalizePhone } from '../utils/phone'
import NotFound from './NotFound'

const STEPS = ['Seus dados', 'Sua casa', 'Confirmação']

const HOUSING = [
  { value: '', label: 'Selecione' },
  { value: 'casa-quintal', label: 'Casa com quintal' },
  { value: 'casa', label: 'Casa sem quintal' },
  { value: 'apartamento', label: 'Apartamento' }
]

const INITIAL = {
  name: '',
  email: '',
  phone: '',
  city: '',
  housing: '',
  hasOtherPets: false,
  message: '',
  agreeVisit: false
}

// Em que etapa fica cada campo: um erro da API leva a pessoa de volta até ele.
const FIELD_STEP = { name: 0, email: 0, phone: 0, city: 0, housing: 1, hasOtherPets: 1, message: 1, agreeVisit: 2 }

/** Mesmas regras do backend (adoptionsRoutes.js), para o erro aparecer antes do envio. */
function validate(step, values) {
  const errors = {}
  if (step === 0) {
    if (!values.name.trim()) errors.name = 'Informe seu nome.'
    else if (values.name.trim().length > 120) errors.name = 'O nome pode ter até 120 caracteres.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Informe um e-mail válido.'
    if (!normalizePhone(values.phone)) errors.phone = 'Informe um telefone com DDD, por exemplo (35) 99999-9999.'
    if (!values.city.trim()) errors.city = 'Informe sua cidade.'
    else if (values.city.trim().length > 120) errors.city = 'A cidade pode ter até 120 caracteres.'
  }
  if (step === 1) {
    if (!values.housing) errors.housing = 'Escolha o tipo de moradia.'
    if (values.message.length > 2000) errors.message = 'A mensagem pode ter até 2.000 caracteres.'
  }
  if (step === 2 && !values.agreeVisit) errors.agreeVisit = 'É preciso aceitar a visita para seguir.'
  return errors
}

/** Texto do aviso quando o envio falha, conforme a resposta da API. */
function failureText(error) {
  if (error?.status === 422) return 'Confira o campo destacado e envie de novo.'
  if (error?.status === 404 || error?.status === 409) return error.message
  if (error?.status === 0) return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'
  return 'O servidor não conseguiu registrar o pedido agora. Tente de novo em alguns instantes.'
}

export default function AdoptionForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const wantsVisit = searchParams.get('visita') === '1'
  const pet = useAsync(() => getPet(id), [id])

  const [step, setStep] = useState(0)
  const [values, setValues] = useState(INITIAL)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | sent | failed
  const [sendError, setSendError] = useState(null)
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  // Depois de entrar (ou criar a conta), a pessoa volta para este formulário.
  const back = encodeURIComponent(location.pathname + location.search)

  // Logado: nome e e-mail da conta já preenchidos (sem apagar o que a pessoa digitou).
  useEffect(() => {
    if (!user) return
    setValues((current) => ({ ...current, name: current.name || user.name, email: current.email || user.email }))
  }, [user])

  if (pet.loading || authLoading) return <LoadingState />
  if (pet.error?.status === 404) return <NotFound />
  if (pet.error) {
    return (
      <section className="section section--tight">
        <div className="container"><ErrorState error={pet.error} onRetry={pet.reload} /></div>
      </section>
    )
  }

  const name = pet.data.name

  // Pedir adoção exige conta logada (a API também confere: 401).
  if (!user) {
    return (
      <section className="section section--tight">
        <div className="form-card auth-card">
          <h1 className="t-heading-lg">Entre para adotar {name}</h1>
          <p className="t-muted" style={{ margin: 0 }}>
            Para pedir uma adoção você precisa estar com a conta logada. Assim a ONG sabe quem pediu e você acompanha
            a resposta em Meus pedidos.
          </p>
          <div className="row">
            <Button to={`/entrar?voltar=${back}`}>Entrar</Button>
            <Button variant="outline" to={`/entrar?modo=cadastro&voltar=${back}`}>Criar conta</Button>
          </div>
          <div>
            <Button variant="ghost" icon="arrow-left" to={`/pets/${id}`}>Voltar para {name}</Button>
          </div>
        </div>
      </section>
    )
  }

  function setField(field) {
    return (event) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
      setValues((current) => ({ ...current, [field]: value }))
    }
  }

  function next() {
    const stepErrors = validate(step, values)
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length === 0) setStep((current) => current + 1)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (step < STEPS.length - 1) return next()

    const stepErrors = validate(step, values)
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) return

    setStatus('sending')
    setSendError(null)
    try {
      await createAdoptionRequest({ petId: id, ...values })
      setStatus('sent')
    } catch (error) {
      setSendError(error)
      setStatus('failed')
      // Campo recusado pela API: marca o campo e volta para a etapa dele.
      const fieldErrors = error.status === 422 ? error.details?.errors ?? {} : {}
      const fields = Object.keys(fieldErrors)
      if (fields.length > 0) {
        setErrors(fieldErrors)
        setStep(Math.min(...fields.map((field) => FIELD_STEP[field] ?? STEPS.length - 1)))
      }
    }
  }

  if (status === 'sent') {
    return (
      <section className="section section--tight">
        <div className="form-card">
          <Alert tone="success" title="Pedido enviado">
            Recebemos seu pedido para adotar {name}. A ONG vai entrar em contato por e-mail em até 3 dias úteis para agendar a visita.
          </Alert>
          <div className="row">
            <Button to="/meus-pedidos">Ver meus pedidos</Button>
            <Button to="/adotar" variant="outline">Ver outros pets</Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section section--tight">
      <form className="form-card" onSubmit={handleSubmit} noValidate>
        <div className="stack">
          <h1 className="t-heading-lg">Pedido para adotar {name}</h1>
          {wantsVisit && <p className="t-muted">Depois do pedido, a ONG combina a data da visita com você.</p>}
        </div>

        <Stepper steps={STEPS} current={step} />

        {step === 0 && (
          <div className="form-grid">
            <TextField className="span-2" label="Nome completo" autoComplete="name" value={values.name} onChange={setField('name')} error={errors.name} />
            <TextField label="E-mail" type="email" autoComplete="email" value={values.email} onChange={setField('email')} error={errors.email} hint="Enviamos a resposta da ONG por aqui." />
            <TextField label="Telefone" type="tel" autoComplete="tel" placeholder="(11) 91234-5678" value={values.phone} onChange={setField('phone')} error={errors.phone} />
            <TextField className="span-2" label="Cidade" autoComplete="address-level2" value={values.city} onChange={setField('city')} error={errors.city} />
          </div>
        )}

        {step === 1 && (
          <div className="stack">
            <TextField label="Tipo de moradia" options={HOUSING} value={values.housing} onChange={setField('housing')} error={errors.housing} />
            <Checkbox label="Já tenho outros pets em casa" checked={values.hasOtherPets} onChange={setField('hasOtherPets')} />
            <TextField
              label={`Por que você quer adotar ${name}?`}
              multiline
              value={values.message}
              onChange={setField('message')}
              error={errors.message}
              hint="Opcional. Ajuda a ONG a conhecer você."
            />
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <Alert tone="info" title="Confira seus dados">
              {values.name} · {values.email} · {values.phone} · {values.city}
            </Alert>
            <Checkbox
              label={`Aceito receber uma visita da ONG antes de levar ${name} para casa`}
              checked={values.agreeVisit}
              onChange={setField('agreeVisit')}
            />
            {errors.agreeVisit && <p className="ap-field__hint" style={{ color: 'var(--danger)' }}>{errors.agreeVisit}</p>}
          </div>
        )}

        {/* Fora das etapas: aparece também quando a API manda de volta para um campo de outra etapa. */}
        {status === 'failed' && (
          sendError?.status === 401 ? (
            <Alert tone="danger" title="Sua sessão terminou">
              <Link to={`/entrar?voltar=${back}`}>Entre de novo</Link> para enviar o pedido.
            </Alert>
          ) : (
            <Alert tone="danger" title="Não foi possível enviar">{failureText(sendError)}</Alert>
          )
        )}

        <div className="form-actions">
          {step > 0 ? (
            <Button variant="ghost" icon="arrow-left" onClick={() => setStep((current) => current - 1)}>Voltar</Button>
          ) : <span />}
          <Button type="submit" disabled={status === 'sending'}>
            {step < STEPS.length - 1 ? 'Continuar' : status === 'sending' ? 'Enviando…' : 'Enviar pedido'}
          </Button>
        </div>
      </form>
    </section>
  )
}
