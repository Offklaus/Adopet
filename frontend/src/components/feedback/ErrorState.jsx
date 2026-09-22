import { Alert, Button } from '../ui'

export function ErrorState({ error, onRetry }) {
  return (
    <div className="stack" style={{ alignItems: 'flex-start' }}>
      <Alert tone="danger" title="Não conseguimos carregar agora">
        {error?.message ?? 'Tente de novo em alguns instantes.'}
      </Alert>
      {onRetry && <Button variant="outline" onClick={onRetry}>Tentar de novo</Button>}
    </div>
  )
}
