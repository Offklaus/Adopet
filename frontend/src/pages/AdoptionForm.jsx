import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { Alert, Button, Checkbox, Stepper, TextField } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { createAdoptionRequest } from '../services/adoptionsService'
import { getPet } from '../services/petsService'
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

function validate(step, values) {
  const errors = {}
  if (step === 0) {
    if (!values.name.trim()) errors.name = 'Informe seu nome.'
    if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = 'Informe um e-mail válido.'
    if (values.phone.replace(/\D/g, '').length < 10) errors.phone = 'Informe um telefone com DDD.'
    if (!values.city.trim()) errors.city = 'Informe sua cidade.'
  }
  if (step === 1 && !values.housing) errors.housing = 'Escolha o tipo de moradia.'
  if (step === 2 && !values.agreeVisit) errors.agreeVisit = 'É preciso aceitar a visita para seguir.'
  return errors
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

  if (pet.loading) return <LoadingState />
  if (pet.error?.status === 404) return <NotFound />
  if (pet.error) {
    return (
      <section className="section section--tight">
        <div className="container"><ErrorState error={pet.error} onRetry={pet.reload} /></div>
      </section>
    )
  }

  const name = pet.data.name

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
    try {
      await createAdoptionRequest({ petId: id, ...values })
      setStatus('sent')
    } catch {
      setStatus('failed')
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
            {status === 'failed' && (
              <Alert tone="danger" title="Não foi possível enviar">Verifique sua conexão e tente de novo.</Alert>
            )}
          </div>
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
