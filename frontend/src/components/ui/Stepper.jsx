import { cx } from '../../utils/cx'
import { Icon } from './Icon'

/** Etapas numeradas; `current` é o índice da etapa atual. */
export function Stepper({ steps = [], current = 0, className }) {
  return (
    <ol className={cx('ap-steps', className)}>
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo'
        return (
          <li key={step} className={`ap-step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="ap-step__dot">
              {state === 'done' ? <Icon name="check" size={16} /> : index + 1}
            </span>
            <span className="ap-step__label">{step}</span>
          </li>
        )
      })}
    </ol>
  )
}
