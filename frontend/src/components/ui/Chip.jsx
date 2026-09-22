import { cx } from '../../utils/cx'
import { Icon } from './Icon'

/** Filtro selecionável (toggle). */
export function Chip({ selected = false, icon, onClick, className, children }) {
  return (
    <button
      type="button"
      className={cx('ap-chip', selected && 'is-selected', className)}
      aria-pressed={selected}
      onClick={onClick}
    >
      {selected ? <Icon name="check" size={16} /> : icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  )
}
