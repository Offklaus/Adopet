import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, TextField } from '../components/ui'
import { createCampaign } from '../services/campaignsService'
import { formatBRL } from '../utils/formatBRL'

// Mesmas regras do backend (campaignsRoutes.js).
const MAX_TITLE = 80
const MAX_DESCRIPTION = 300
const MAX_TAG = 30
const MAX_GOAL = 10_000_000

const EMPTY = { title: '', description: '', tag: '', goal: '' }

/** "3.500", "R$ 3500" → 3500. Centavos (vírgula) não são aceitos: o site usa reais inteiros. */
function parseGoal(text) {
  const clean = text.replace(/R\$|\s/gi, '')
  if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(clean)) return NaN
  return Number(clean.replace(/\./g, ''))
}

function validate(values) {
  const errors = {}
  if (!values.title.trim()) errors.title = 'Informe o título.'
  else if (values.title.trim().length > MAX_TITLE) errors.title = `O título pode ter até ${MAX_TITLE} caracteres.`
  if (!values.description.trim()) errors.description = 'Conte para que é a campanha.'
  else if (values.description.trim().length > MAX_DESCRIPTION) {
    errors.description = `A descrição pode ter até ${MAX_DESCRIPTION} caracteres.`
  }
  if (values.tag.trim().length > MAX_TAG) errors.tag = `A etiqueta pode ter até ${MAX_TAG} caracteres.`
  const goal = parseGoal(values.goal)
  if (!values.goal.trim()) errors.goal = 'Informe a meta.'
  else if (!Number.isInteger(goal) || goal < 1 || goal > MAX_GOAL) {
    errors.goal = `Use reais inteiros, de R$ 1 a ${formatBRL(MAX_GOAL)} (ex.: 3.500).`
  }
  return errors
}

/** Criação de campanha (administração). Depois de criar, volta para a lista com o aviso. */
export default function CampaignNew() {
  const navigate = useNavigate()
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState(null)

  // Editar um campo tira o erro dele (o resto só é conferido de novo ao enviar).
  const setField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function showFeedback(next) {
    setFeedback(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      showFeedback({ tone: 'danger', title: 'Confira os campos destacados.' })
      return
    }

    setSending(true)
    try {
      const campaign = await createCampaign({
        title: values.title.trim(),
        description: values.description.trim(),
        tag: values.tag.trim() || undefined,
        goal: parseGoal(values.goal)
      })
      navigate('/admin/campanhas', { state: { createdTitle: campaign.title } })
    } catch (error) {
      setSending(false)
      if (error.status === 401) {
        showFeedback({ tone: 'danger', title: 'Sua sessão terminou', text: 'Entre de novo com a conta de administrador.' })
      } else if (error.status === 403) {
        showFeedback({ tone: 'danger', title: 'Acesso restrito', text: 'Esta área é só para administradores.' })
      } else if (error.status === 422) {
        setErrors(error.details?.errors ?? {})
        showFeedback({ tone: 'danger', title: error.message })
      } else {
        showFeedback({ tone: 'danger', title: 'Não foi possível criar a campanha', text: error.message })
      }
    }
  }

  const goalPreview = parseGoal(values.goal)

  return (
    <section className="section section--tight">
      <form className="form-card" onSubmit={handleSubmit} noValidate>
        <div>
          <Button variant="ghost" to="/admin/campanhas" icon="arrow-left">Voltar para as campanhas</Button>
        </div>
        <div className="stack">
          <h1 className="t-heading-lg">Nova campanha</h1>
          <p className="t-muted" style={{ margin: 0 }}>
            A campanha aparece na página Doar assim que for criada, com a meta zerada.
          </p>
        </div>

        {feedback && <Alert tone={feedback.tone} title={feedback.title}>{feedback.text}</Alert>}

        <TextField
          label="Título"
          placeholder="Ex.: Cirurgia do Thor"
          maxLength={MAX_TITLE}
          value={values.title}
          onChange={setField('title')}
          error={errors.title}
        />
        <TextField
          label="Descrição"
          multiline
          placeholder="Para que é o dinheiro e quem ele ajuda."
          maxLength={MAX_DESCRIPTION}
          value={values.description}
          onChange={setField('description')}
          error={errors.description}
          hint={`${values.description.length}/${MAX_DESCRIPTION} caracteres. Aparece no card da campanha.`}
        />
        <div className="form-grid">
          <TextField
            label="Meta (R$)"
            inputMode="numeric"
            placeholder="Ex.: 3.500"
            value={values.goal}
            onChange={setField('goal')}
            error={errors.goal}
            hint={Number.isInteger(goalPreview) && goalPreview > 0 ? `Meta de ${formatBRL(goalPreview)}.` : 'Em reais inteiros.'}
          />
          <TextField
            label="Etiqueta"
            placeholder="Ex.: Urgente"
            maxLength={MAX_TAG}
            value={values.tag}
            onChange={setField('tag')}
            error={errors.tag}
            hint="Opcional. Destaque no topo do card."
          />
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={() => { setValues(EMPTY); setErrors({}); setFeedback(null) }}>Limpar</Button>
          <Button type="submit" disabled={sending}>{sending ? 'Criando…' : 'Criar campanha'}</Button>
        </div>
      </form>
    </section>
  )
}
