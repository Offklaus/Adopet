import { useMemo, useState } from 'react'
import { AdminNav } from '../components/admin/AdminNav'
import { ErrorState } from '../components/feedback/ErrorState'
import { LoadingState } from '../components/feedback/LoadingState'
import { Alert, Badge, Chip, Icon, TextField } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { listDonations } from '../services/campaignsService'
import { formatBRL } from '../utils/formatBRL'

const STATUS = {
  pending: { tone: 'warning', label: 'Pendente' },
  paid: { tone: 'success', label: 'Paga' },
  canceled: { tone: 'neutral', label: 'Cancelada' }
}
const STATUS_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'paid', label: 'Pagas' },
  { value: 'canceled', label: 'Canceladas' }
]
const FREE = 'livre'
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

const sumAmount = (list) => list.reduce((total, donation) => total + donation.amount, 0)

/** Doações registradas no site (administração). */
export default function AdminDonations() {
  const donations = useAsync(() => listDonations(), [])
  const [statusFilter, setStatusFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')

  const all = donations.data ?? []

  // Campanhas que aparecem nas doações (e "Doação livre" para as sem campanha).
  const campaignOptions = useMemo(() => {
    const titles = new Map()
    for (const donation of all) titles.set(donation.campaignId ?? FREE, donation.campaignTitle ?? 'Doação livre')
    return [{ value: '', label: 'Todas as campanhas' }, ...[...titles].map(([value, label]) => ({ value, label }))]
  }, [all])

  // O filtro de campanha vale para tudo; o de situação, só para a tabela (os chips mostram o total de cada uma).
  const byCampaign = useMemo(
    () => all.filter((donation) => !campaignFilter || (donation.campaignId ?? FREE) === campaignFilter),
    [all, campaignFilter]
  )
  const filtered = useMemo(
    () => byCampaign.filter((donation) => !statusFilter || donation.status === statusFilter),
    [byCampaign, statusFilter]
  )
  const countOf = (status) => byCampaign.filter((donation) => !status || donation.status === status).length
  const totalOf = (status) => sumAmount(byCampaign.filter((donation) => donation.status === status))
  // Canceladas não são dinheiro que vai entrar: ficam fora do total.
  const active = byCampaign.filter((donation) => donation.status !== 'canceled')

  return (
    <section className="section section--tight">
      <div className="container stack" style={{ gap: 24 }}>
        <AdminNav />
        <div>
          <h1 className="t-display-lg">Doações</h1>
          {donations.data && <p className="t-muted" style={{ margin: 0 }}>{all.length} doação(ões) registrada(s) no site</p>}
        </div>

        {donations.loading && <LoadingState label="Buscando doações…" />}
        {donations.error && <ErrorState error={donations.error} onRetry={donations.reload} />}

        {donations.data && (
          <>
            <Alert tone="info" title="Pagamento ainda não integrado">
              Toda doação fica como Pendente: o site registra a intenção de doar, e o valor só deve entrar na meta da
              campanha quando o pagamento (Pix ou cartão) for confirmado.
            </Alert>

            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-card__label">Total registrado</span>
                <strong className="stat-card__value">{formatBRL(sumAmount(active))}</strong>
                <span className="stat-card__hint">
                  {active.length} doação(ões){countOf('canceled') > 0 && `, sem ${countOf('canceled')} cancelada(s)`}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">Pendente</span>
                <strong className="stat-card__value">{formatBRL(totalOf('pending'))}</strong>
                <span className="stat-card__hint">{countOf('pending')} doação(ões)</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__label">Pago</span>
                <strong className="stat-card__value">{formatBRL(totalOf('paid'))}</strong>
                <span className="stat-card__hint">{countOf('paid')} doação(ões)</span>
              </div>
            </div>

            <div className="donation-filters">
              <div className="row" role="group" aria-label="Situação da doação">
                {STATUS_FILTERS.map((filter) => (
                  <Chip key={filter.value} selected={statusFilter === filter.value} onClick={() => setStatusFilter(filter.value)}>
                    {filter.label} ({countOf(filter.value)})
                  </Chip>
                ))}
              </div>
              <TextField
                label="Campanha"
                options={campaignOptions}
                value={campaignFilter}
                onChange={(event) => setCampaignFilter(event.target.value)}
              />
            </div>

            {filtered.length === 0 ? (
              <div className="state">
                <Icon name="gift" size={32} />
                <p>{all.length === 0 ? 'Nenhuma doação registrada ainda.' : 'Nenhuma doação com esses filtros.'}</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <caption className="sr-only">Doações registradas</caption>
                  <thead>
                    <tr>
                      <th scope="col">Data</th>
                      <th scope="col">Campanha</th>
                      <th scope="col" className="is-number">Valor</th>
                      <th scope="col">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((donation) => {
                      const status = STATUS[donation.status] ?? STATUS.pending
                      return (
                        <tr key={donation.id}>
                          <td>{dateFormat.format(new Date(donation.createdAt))}</td>
                          <td>{donation.campaignTitle ?? <span className="t-muted">Doação livre</span>}</td>
                          <td className="is-number">{formatBRL(donation.amount)}</td>
                          <td><Badge tone={status.tone}>{status.label}</Badge></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
