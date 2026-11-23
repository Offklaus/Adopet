import { cx } from '../../utils/cx'

/** Barra de meta (amarelo-sol, cor de doação). */
export function ProgressBar({ value = 0, max = 100, label = 'Progresso', showValue = true, className }) {
  const clamped = Math.max(0, Math.min(value, max))
  const percent = Math.round((clamped / max) * 100)

  return (
    <div className={cx('ap-progress', className)}>
      <div
        className="ap-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-label={label}
      >
        <div className="ap-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      {showValue && <span className="ap-progress__pct">{percent}%</span>}
    </div>
  )
}
