import { cx } from '../../utils/cx'
import { Icon } from './Icon'

export function Checkbox({ label, className, ...rest }) {
  return (
    <label className={cx('ap-check', className)}>
      <input type="checkbox" className="ap-check__input" {...rest} />
      <span className="ap-check__box" aria-hidden="true">
        <Icon name="check" size={14} />
      </span>
      <span>{label}</span>
    </label>
  )
}
