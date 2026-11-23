import { useState } from 'react'
import { cx } from '../../utils/cx'
import { formatBRL } from '../../utils/formatBRL'
import { donationLink } from '../../utils/whatsapp'
import { Badge, Button, ProgressBar } from '../ui'

const DEFAULT_AMOUNTS = [20, 50, 100, 200]

/**
 * Card de campanha com a meta e valores sugeridos. O site não recebe dinheiro:
 * "Doar" abre o WhatsApp da ONG (`whatsapp`) com a mensagem pronta
 * ("Olá! Quero doar R$ 50 para a campanha …") e o pagamento é combinado direto com ela.
 */
export function DonationCard({
  title,
  description,
  tag,
  raised,
  goal,
  whatsapp,
  amounts = DEFAULT_AMOUNTS,
  defaultAmount,
  className
}) {
  const [amount, setAmount] = useState(defaultAmount ?? amounts[1] ?? amounts[0])

  return (
    <section className={cx('ap-donate', className)} aria-label={title}>
      {tag && <Badge tone="donate" icon="gift">{tag}</Badge>}
      <h3 className="ap-donate__title">{title}</h3>
      {description && <p className="ap-donate__desc">{description}</p>}

      {goal > 0 && (
        <div className="ap-donate__goal">
          <p className="ap-donate__nums">
            <strong>{formatBRL(raised)}</strong> arrecadados de {formatBRL(goal)}
          </p>
          <ProgressBar value={raised ?? 0} max={goal} label="Meta da campanha" />
        </div>
      )}

      <div className="ap-donate__amounts" role="group" aria-label="Valor da doação">
        {amounts.map((value) => (
          <button
            key={value}
            type="button"
            className={cx('ap-amount', amount === value && 'is-selected')}
            aria-pressed={amount === value}
            onClick={() => setAmount(value)}
          >
            {formatBRL(value)}
          </button>
        ))}
      </div>

      <Button
        variant="donate"
        size="lg"
        full
        icon="heart"
        href={donationLink({ title, whatsapp }, amount)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Doar {formatBRL(amount)}
      </Button>
      <p className="ap-donate__note">
        Abre o WhatsApp da ONG com a mensagem pronta. O pagamento é combinado direto com ela.
      </p>
    </section>
  )
}
