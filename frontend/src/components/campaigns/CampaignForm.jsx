import { useState } from 'react'
import { formatBRL } from '../../utils/formatBRL'
import { formatPhone, normalizePhone } from '../../utils/phone'
import { Alert, Button, TextField } from '../ui'

// Mesmas regras do backend (campaignsRoutes.js).
const MAX_TITLE = 80
const MAX_DESCRIPTION = 300
const MAX_TAG = 30
const MAX_VALUE = 10_000_000

const EMPTY = { title: '', description: '', tag: '', goal: '', raised: '', whatsapp: '' }

/** "3.500", "R$ 3500" → 3500. Centavos (vírgula) não são aceitos: o site usa reais inteiros. */
function parseReais(text) {
  const clean = text.replace(/R\$|\s/gi, '')
  if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(clean)) return NaN
  return Number(clean.replace(/\./g, ''))
}

/** Arrecadado em branco conta como 0 (campanha nova). */
const parseRaised = (text) => (text.trim() ? parseReais(text) : 0)

/** Campanha da API → valores do formulário (valores como "3.500", WhatsApp como "(35) 99999-9999"). */
const toValues = (campaign) => ({
  title: campaign.title,
  description: campaign.description ?? '',
  tag: campaign.tag ?? '',
  goal: campaign.goal.toLocaleString('pt-BR'),
  raised: campaign.raised.toLocaleString('pt-BR'),
  whatsapp: formatPhone(campaign.whatsapp)
})

function validate(values) {
  const errors = {}
  if (!values.title.trim()) errors.title = 'Informe o título.'
  else if (values.title.trim().length > MAX_TITLE) errors.title = `O título pode ter até ${MAX_TITLE} caracteres.`
  if (!values.description.trim()) errors.description = 'Conte para que é a campanha.'
  else if (values.description.trim().length > MAX_DESCRIPTION) {
    errors.description = `A descrição pode ter até ${MAX_DESCRIPTION} caracteres.`
  }
  if (values.tag.trim().length > MAX_TAG) errors.tag = `A etiqueta pode ter até ${MAX_TAG} caracteres.`
  const goal = parseReais(values.goal)
  if (!values.goal.trim()) errors.goal = 'Informe a meta.'
  else if (!Number.isInteger(goal) || goal < 1 || goal > MAX_VALUE) {
    errors.goal = `Use reais inteiros, de R$ 1 a ${formatBRL(MAX_VALUE)} (ex.: 3.500).`
  }
  const raised = parseRaised(values.raised)
  if (!Number.isInteger(raised) || raised < 0 || raised > MAX_VALUE) {
    errors.raised = 'Use reais inteiros, 0 ou mais (ex.: 1.200).'
  }
  if (!normalizePhone(values.whatsapp)) errors.whatsapp = 'Informe o WhatsApp da ONG com DDD, ex.: (35) 99999-9999.'
  return errors
}

/** 401 = sessão terminou; 403 = conta sem permissão de administrador. */
function sessionProblem(error) {
  if (error.status === 401) {
    return { tone: 'danger', title: 'Sua sessão terminou', text: 'Entre de novo com a conta de administrador.' }
  }
  if (error.status === 403) {
    return { tone: 'danger', title: 'Acesso restrito', text: 'Esta área é só para administradores.' }
  }
  return null
}

/**
 * Formulário de campanha usado na criação e na edição.
 * `onSubmit(payload)` chama a API e devolve a campanha salva; depois disso a página chama `onSaved(campanha)`.
 * Com `onEnd`, aparece a seção "Encerrar campanha" (só na edição).
 */
export function CampaignForm({ title, intro, initialCampaign, submitLabel, sendingLabel, onSubmit, onSaved, onEnd }) {
  const [values, setValues] = useState(() => (initialCampaign ? toValues(initialCampaign) : EMPTY))
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  const [ending, setEnding] = useState(false)

  // Editar um campo tira o erro dele (o resto só é conferido de novo ao enviar).
  const setField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function showFeedback(next) {
    setFeedback(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function showError(error, fallbackTitle) {
    if (sessionProblem(error)) showFeedback(sessionProblem(error))
    else if (error.status === 409) showFeedback({ tone: 'warning', title: error.message })
    else showFeedback({ tone: 'danger', title: fallbackTitle, text: error.message })
  }

  function reset() {
    setValues(initialCampaign ? toValues(initialCampaign) : EMPTY)
    setErrors({})
    setFeedback(null)
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
      const campaign = await onSubmit({
        title: values.title.trim(),
        description: values.description.trim(),
        tag: values.tag.trim() || undefined,
        goal: parseReais(values.goal),
        raised: parseRaised(values.raised),
        whatsapp: normalizePhone(values.whatsapp)
      })
      // Em caso de sucesso a página sai daqui (volta para a lista).
      onSaved(campaign)
    } catch (error) {
      setSending(false)
      if (error.status === 422) {
        setErrors(error.details?.errors ?? {})
        showFeedback({ tone: 'danger', title: error.message })
      } else {
        showError(error, 'Não foi possível salvar a campanha')
      }
    }
  }

  async function handleEnd() {
    setEnding(true)
    try {
      await onEnd()
    } catch (error) {
      setEnding(false)
      setConfirmingEnd(false)
      showError(error, 'Não foi possível encerrar a campanha')
    }
  }

  const goalPreview = parseReais(values.goal)
  const raisedPreview = parseRaised(values.raised)
  const name = initialCampaign?.title

  return (
    <section className="section section--tight">
      <form className="form-card" onSubmit={handleSubmit} noValidate>
        <div>
          <Button variant="ghost" to="/admin/campanhas" icon="arrow-left">Voltar para as campanhas</Button>
        </div>
        <div className="stack">
          <h1 className="t-heading-lg">{title}</h1>
          {intro && <p className="t-muted" style={{ margin: 0 }}>{intro}</p>}
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
            label="Valor arrecadado (R$)"
            inputMode="numeric"
            placeholder="0"
            value={values.raised}
            onChange={setField('raised')}
            error={errors.raised}
            hint={
              Number.isInteger(raisedPreview) && raisedPreview > 0
                ? `${formatBRL(raisedPreview)} na barra da campanha. Atualize quando a ONG confirmar uma doação.`
                : 'Atualize quando a ONG confirmar uma doação. Em branco = R$ 0.'
            }
          />
        </div>
        <div className="form-grid">
          <TextField
            label="WhatsApp da ONG"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="(35) 99999-9999"
            value={values.whatsapp}
            onChange={setField('whatsapp')}
            error={errors.whatsapp}
            hint="O botão Doar abre uma conversa com este número, com a mensagem pronta."
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
          <Button variant="ghost" onClick={reset}>{initialCampaign ? 'Desfazer alterações' : 'Limpar'}</Button>
          <Button type="submit" disabled={sending || ending}>{sending ? sendingLabel : submitLabel}</Button>
        </div>

        {onEnd && (
          <fieldset className="form-section form-section--danger">
            <legend className="t-heading-sm">Encerrar campanha</legend>
            <p className="t-body-sm t-muted">
              {name} sai da página Doar e o botão do WhatsApp deixa de aparecer. O valor arrecadado continua
              registrado. Não dá para reabrir.
            </p>
            {confirmingEnd ? (
              <div className="row">
                <Button variant="ghost" onClick={() => setConfirmingEnd(false)} disabled={ending}>Voltar</Button>
                <Button variant="danger" onClick={handleEnd} disabled={ending}>
                  {ending ? 'Encerrando…' : `Sim, encerrar ${name}`}
                </Button>
              </div>
            ) : (
              <div>
                <Button variant="danger" icon="x" onClick={() => setConfirmingEnd(true)} disabled={sending}>
                  Encerrar campanha
                </Button>
              </div>
            )}
          </fieldset>
        )}
      </form>
    </section>
  )
}
