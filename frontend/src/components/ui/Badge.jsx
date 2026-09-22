import { cx } from '../../utils/cx'
import { Icon } from './Icon'

/** Etiqueta curta. tone: neutral · primary · secondary · donate · success · warning · danger */
export function Badge({ tone = 'neutral', icon, className, children }) {
  return (
    <span className={cx('ap-badge', `ap-badge--${tone}`, className)}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  )
}
