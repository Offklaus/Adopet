import { useState } from 'react'
import { cx } from '../../utils/cx'
import { formatBRL } from '../../utils/formatBRL'
import { Badge, Button, ProgressBar } from '../ui'

const DEFAULT_AMOUNTS = [20, 50, 100, 200]

/**
 * Card de doação com meta opcional e valores rápidos.
 * O checkout (Pix, cartão) fica com quem usa o card, via onDonate(amount).
 */
export function DonationCard({
  title,
  description,
  tag,
  raised,
  goal,
  supporters,
  amounts = DEFAULT_AMOUNTS,
  defaultAmount,
  onSelect,
  onDonate,
  className
}) {
  const [amount, setAmount] = useState(defaultAmount ?? amounts[1] ?? amounts[0])

  function select(value) {
    setAmount(value)
    onSelect?.(value)
  }

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
          {supporters > 0 && <p className="ap-donate__sup">{supporters} apoiadores</p>}
        </div>
      )}

      <div className="ap-donate__amounts" role="group" aria-label="Valor da doação">
        {amounts.map((value) => (
          <button
            key={value}
            type="button"
            className={cx('ap-amount', amount === value && 'is-selected')}
            aria-pressed={amount === value}
            onClick={() => select(value)}
          >
            {formatBRL(value)}
          </button>
        ))}
      </div>

      <Button variant="donate" size="lg" full icon="heart" onClick={() => onDonate?.(amount)}>
        Doar {formatBRL(amount)}
      </Button>
    </section>
  )
}
