import { Icon } from '../ui'

export function LoadingState({ label = 'Carregando…' }) {
  return (
    <div className="state" role="status">
      <Icon name="paw" size={32} />
      <p>{label}</p>
    </div>
  )
}
