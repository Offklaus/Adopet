import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminKey } from '../../hooks/useAdminKey'
import { AdminKeyField } from '../admin/AdminKeyField'
import { Alert, Button, Chip, TextField } from '../ui'

const MAX_TAGS = 5

const SPECIES = [
  { value: '', label: 'Selecione' },
  { value: 'cao', label: 'Cão' },
  { value: 'gato', label: 'Gato' }
]
const SEXES = [
  { value: '', label: 'Selecione' },
  { value: 'Macho', label: 'Macho' },
  { value: 'Fêmea', label: 'Fêmea' }
]
const SIZES = [
  { value: '', label: 'Selecione' },
  { value: 'Porte pequeno', label: 'Pequeno' },
  { value: 'Porte médio', label: 'Médio' },
  { value: 'Porte grande', label: 'Grande' }
]
const STATUSES = [
  { value: 'available', label: 'Disponível para adoção' },
  { value: 'reserved', label: 'Em processo de adoção' },
  { value: 'adopted', label: 'Já adotado' }
]
const STATES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
]
const STATE_OPTIONS = [{ value: '', label: 'UF' }, ...STATES.map((uf) => ({ value: uf, label: uf }))]

// A etiqueta acompanha o sexo do animal: "Vacinado" / "Vacinada".
const TAGS = [
  { key: 'vacinado', male: 'Vacinado', female: 'Vacinada' },
  { key: 'castrado', male: 'Castrado', female: 'Castrada' },
  { key: 'vermifugado', male: 'Vermifugado', female: 'Vermifugada' },
  { key: 'filhote', male: 'Filhote', female: 'Filhote' },
  { key: 'docil', male: 'Dócil', female: 'Dócil' },
  { key: 'idoso', male: 'Idoso', female: 'Idosa' }
]

export const EMPTY_PET = {
  name: '',
  species: '',
  age: '',
  sex: '',
  size: '',
  status: 'available',
  tags: [],
  // Etiquetas salvas que não estão na lista acima (ex.: cadastradas pela API).
  extraTags: [],
  story: '',
  photo: '',
  photoAlt: '',
  street: '',
  neighborhood: '',
  city: '',
  state: '',
  latitude: '',
  longitude: ''
}

const tagLabel = (tag, sex) => (sex === 'Fêmea' ? tag.female : tag.male)
// Aceita vírgula decimal ("-23,55").
const parseCoordinate = (text) => Number(text.trim().replace(',', '.'))

function isHttpUrl(value) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

/** Converte um pet da API nos valores do formulário. */
export function petToValues(pet) {
  const tags = []
  const extraTags = []
  for (const label of pet.tags ?? []) {
    const tag = TAGS.find((item) => item.male === label || item.female === label)
    if (!tag) extraTags.push(label)
    else if (!tags.includes(tag.key)) tags.push(tag.key)
  }
  const text = (value) => value ?? ''
  const coordinate = (value) => (value == null ? '' : String(value).replace('.', ','))
  return {
    name: pet.name,
    species: pet.species,
    age: pet.age,
    sex: pet.sex,
    size: pet.size,
    status: pet.status,
    tags,
    extraTags,
    story: text(pet.story),
    photo: text(pet.photo),
    photoAlt: text(pet.photoAlt),
    street: text(pet.street),
    neighborhood: text(pet.neighborhood),
    city: pet.city,
    state: pet.state,
    latitude: coordinate(pet.latitude),
    longitude: coordinate(pet.longitude)
  }
}

/** Mesmas regras do backend (petsRoutes.js), para o erro aparecer antes do envio. */
function validate(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'Informe o nome.'
  else if (values.name.trim().length > 60) errors.name = 'O nome pode ter até 60 caracteres.'
  if (!values.species) errors.species = 'Escolha a espécie.'
  if (!values.age.trim()) errors.age = 'Informe a idade, por exemplo "2 anos" ou "4 meses".'
  if (!values.sex) errors.sex = 'Escolha o sexo.'
  if (!values.size) errors.size = 'Escolha o porte.'
  if (values.story.length > 2000) errors.story = 'A história pode ter até 2.000 caracteres.'
  if (values.photo.trim() && !isHttpUrl(values.photo.trim())) errors.photo = 'Use um link que comece com http:// ou https://.'
  if (!values.city.trim()) errors.city = 'Informe a cidade.'
  if (!values.state) errors.state = 'Escolha a UF.'

  const hasLat = values.latitude.trim() !== ''
  const hasLng = values.longitude.trim() !== ''
  if (hasLat !== hasLng) {
    errors.latitude = 'Preencha latitude e longitude juntas, ou deixe as duas vazias.'
  } else if (hasLat) {
    const lat = parseCoordinate(values.latitude)
    const lng = parseCoordinate(values.longitude)
    if (!Number.isFinite(lat) || Math.abs(lat) > 90) errors.latitude = 'Latitude deve ser um número entre -90 e 90.'
    if (!Number.isFinite(lng) || Math.abs(lng) > 180) errors.longitude = 'Longitude deve ser um número entre -180 e 180.'
  }
  return errors
}

/** Corpo enviado para POST /api/pets e PUT /api/pets/:id. */
function toPayload(values) {
  const optional = (text) => text.trim() || undefined
  const hasCoordinates = values.latitude.trim() !== ''
  return {
    name: values.name.trim(),
    species: values.species,
    age: values.age.trim(),
    sex: values.sex,
    size: values.size,
    status: values.status,
    tags: [
      ...TAGS.filter((tag) => values.tags.includes(tag.key)).map((tag) => tagLabel(tag, values.sex)),
      ...values.extraTags
    ],
    story: optional(values.story),
    photo: optional(values.photo),
    photoAlt: optional(values.photoAlt),
    street: optional(values.street),
    neighborhood: optional(values.neighborhood),
    city: values.city.trim(),
    state: values.state,
    ...(hasCoordinates && {
      latitude: parseCoordinate(values.latitude),
      longitude: parseCoordinate(values.longitude)
    })
  }
}

/**
 * Formulário de animal usado no cadastro e na edição.
 * `onSubmit(payload, adminKey)` chama a API e devolve o pet salvo.
 */
export function PetForm({
  title,
  initialPet,
  submitLabel,
  sendingLabel,
  resetLabel,
  onSubmit,
  successTitle,
  successText,
  clearAfterSuccess = false,
  backTo,
  // Opcional: com ele aparece a seção "Excluir animal". Recebe a chave de administrador.
  onDelete
}) {
  const [baseline, setBaseline] = useState(() => (initialPet ? petToValues(initialPet) : EMPTY_PET))
  const [values, setValues] = useState(baseline)
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [photoBroken, setPhotoBroken] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { adminKey, setAdminKey, remember, setRemember, persist } = useAdminKey()

  const tagCount = values.tags.length + values.extraTags.length

  function setField(field) {
    return (event) => {
      const { value } = event.target
      if (field === 'photo') setPhotoBroken(false)
      setValues((current) => ({ ...current, [field]: value }))
    }
  }

  function toggleTag(key) {
    setValues((current) => {
      const selected = current.tags.includes(key)
      if (!selected && current.tags.length + current.extraTags.length >= MAX_TAGS) return current
      return { ...current, tags: selected ? current.tags.filter((item) => item !== key) : [...current.tags, key] }
    })
  }

  function removeExtraTag(label) {
    setValues((current) => ({ ...current, extraTags: current.extraTags.filter((item) => item !== label) }))
  }

  function showFeedback(next) {
    setFeedback(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() {
    setValues(baseline)
    setErrors({})
    setFeedback(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)

    const found = validate(values)
    if (!adminKey.trim()) found.adminKey = 'Informe a chave de administrador.'
    setErrors(found)
    if (Object.keys(found).length > 0) {
      showFeedback({ tone: 'danger', title: 'Confira os campos destacados.' })
      return
    }

    persist()
    setSending(true)
    try {
      const pet = await onSubmit(toPayload(values), adminKey.trim())
      const saved = clearAfterSuccess ? EMPTY_PET : petToValues(pet)
      setBaseline(saved)
      setValues(saved)
      setErrors({})
      showFeedback({ tone: 'success', title: successTitle(pet), text: successText, pet })
    } catch (error) {
      if (error.status === 401) {
        setErrors({ adminKey: 'Chave de administrador inválida.' })
        showFeedback({ tone: 'danger', title: 'Chave recusada', text: 'Confira o valor de ADMIN_API_KEY no backend/.env.' })
      } else if (error.status === 422) {
        setErrors(error.details?.errors ?? {})
        showFeedback({ tone: 'danger', title: error.message })
      } else {
        showFeedback({ tone: 'danger', title: 'Não foi possível salvar', text: error.message })
      }
    } finally {
      setSending(false)
    }
  }

  async function handleDelete() {
    if (!adminKey.trim()) {
      setErrors({ adminKey: 'Informe a chave de administrador.' })
      setConfirmingDelete(false)
      showFeedback({ tone: 'danger', title: 'Informe a chave de administrador para excluir.' })
      return
    }
    persist()
    setDeleting(true)
    try {
      // Em caso de sucesso a página sai daqui (volta para a lista).
      await onDelete(adminKey.trim())
    } catch (error) {
      setDeleting(false)
      setConfirmingDelete(false)
      if (error.status === 401) {
        setErrors({ adminKey: 'Chave de administrador inválida.' })
        showFeedback({ tone: 'danger', title: 'Chave recusada', text: 'Confira o valor de ADMIN_API_KEY no backend/.env.' })
      } else if (error.status === 409) {
        showFeedback({ tone: 'warning', title: 'Não é possível excluir', text: error.message })
      } else {
        showFeedback({ tone: 'danger', title: 'Não foi possível excluir', text: error.message })
      }
    }
  }

  const photoUrl = values.photo.trim()
  const showPreview = isHttpUrl(photoUrl) && !photoBroken

  return (
    <section className="section section--tight">
      <form className="form-card" onSubmit={handleSubmit} noValidate>
        {backTo && (
          <div>
            <Button variant="ghost" to={backTo} icon="arrow-left">Voltar para a lista</Button>
          </div>
        )}
        <div className="stack">
          <h1 className="t-heading-lg">{title}</h1>
        </div>

        {feedback && (
          <Alert tone={feedback.tone} title={feedback.title}>
            {feedback.pet ? (
              <>
                {feedback.text && `${feedback.text} `}
                <Link to={`/pets/${feedback.pet.id}`}>Ver perfil de {feedback.pet.name}</Link>
              </>
            ) : (
              feedback.text
            )}
          </Alert>
        )}

        <fieldset className="form-section">
          <legend className="t-heading-sm">Acesso</legend>
          <AdminKeyField
            adminKey={adminKey}
            setAdminKey={setAdminKey}
            remember={remember}
            setRemember={setRemember}
            error={errors.adminKey}
          />
        </fieldset>

        <fieldset className="form-section">
          <legend className="t-heading-sm">Sobre o animal</legend>
          <div className="form-grid">
            <TextField className="span-2" label="Nome" value={values.name} onChange={setField('name')} error={errors.name} />
            <TextField label="Espécie" options={SPECIES} value={values.species} onChange={setField('species')} error={errors.species} />
            <TextField label="Idade" placeholder="Ex.: 2 anos, 4 meses" value={values.age} onChange={setField('age')} error={errors.age} />
            <TextField label="Sexo" options={SEXES} value={values.sex} onChange={setField('sex')} error={errors.sex} />
            <TextField label="Porte" options={SIZES} value={values.size} onChange={setField('size')} error={errors.size} />
            <TextField className="span-2" label="Situação" options={STATUSES} value={values.status} onChange={setField('status')} error={errors.status} />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend className="t-heading-sm">Saúde e história</legend>
          <div className="stack" style={{ gap: 8 }}>
            <span className="ap-field__label">Etiquetas</span>
            <div className="row" role="group" aria-label="Etiquetas">
              {TAGS.map((tag) => (
                <Chip key={tag.key} selected={values.tags.includes(tag.key)} onClick={() => toggleTag(tag.key)}>
                  {tagLabel(tag, values.sex)}
                </Chip>
              ))}
              {values.extraTags.map((label) => (
                <Chip key={`extra-${label}`} selected onClick={() => removeExtraTag(label)}>
                  {label}
                </Chip>
              ))}
            </div>
            <p className="ap-field__hint" style={errors.tags ? { color: 'var(--danger)' } : undefined}>
              {errors.tags ?? `Até ${MAX_TAGS} (${tagCount} escolhidas). Aparecem no card do animal.`}
            </p>
          </div>
          <TextField
            label="História"
            multiline
            value={values.story}
            onChange={setField('story')}
            error={errors.story}
          />
        </fieldset>

        <fieldset className="form-section">
          <legend className="t-heading-sm">Foto</legend>
          <TextField
            label="Link da foto"
            type="url"
            placeholder="https://..."
            value={values.photo}
            onChange={setField('photo')}
            error={errors.photo}
            hint="Opcional. Sem foto, o card mostra a pata."
          />
          {showPreview && (
            <img className="photo-preview" src={photoUrl} alt="Prévia da foto" onError={() => setPhotoBroken(true)} />
          )}
          <TextField
            label="Descrição da foto"
            placeholder="Ex.: Thor, vira-lata caramelo, deitado na grama"
            value={values.photoAlt}
            onChange={setField('photoAlt')}
            error={errors.photoAlt}
          />
        </fieldset>

        <fieldset className="form-section">
          <legend className="t-heading-sm">Onde ele está</legend>
          <div className="form-grid">
            <TextField className="span-2" label="Rua e número" value={values.street} onChange={setField('street')} error={errors.street} />
            <TextField className="span-2" label="Bairro" value={values.neighborhood} onChange={setField('neighborhood')} error={errors.neighborhood} />
            <TextField label="Cidade" value={values.city} onChange={setField('city')} error={errors.city} />
            <TextField label="UF" options={STATE_OPTIONS} value={values.state} onChange={setField('state')} error={errors.state} />
            <TextField label="Latitude" inputMode="decimal" placeholder="Ex.: -23,5505" value={values.latitude} onChange={setField('latitude')} error={errors.latitude} />
            <TextField label="Longitude" inputMode="decimal" placeholder="Ex.: -46,6333" value={values.longitude} onChange={setField('longitude')} error={errors.longitude} />
          </div>
        </fieldset>

        <div className="form-actions">
          <Button variant="ghost" onClick={reset}>{resetLabel}</Button>
          <Button type="submit" disabled={sending}>{sending ? sendingLabel : submitLabel}</Button>
        </div>

        {onDelete && (
          <fieldset className="form-section form-section--danger">
            <legend className="t-heading-sm">Excluir animal</legend>
            <p className="t-body-sm t-muted">
              Remove {baseline.name} do banco de dados e do site. Não dá para desfazer.
              Se ele foi adotado, prefira mudar a situação para "Já adotado".
            </p>
            {confirmingDelete ? (
              <div className="row">
                <Button variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={deleting}>Cancelar</Button>
                <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Excluindo…' : `Sim, excluir ${baseline.name}`}
                </Button>
              </div>
            ) : (
              <div>
                <Button variant="danger" icon="x" onClick={() => setConfirmingDelete(true)}>Excluir animal</Button>
              </div>
            )}
          </fieldset>
        )}
      </form>
    </section>
  )
}
