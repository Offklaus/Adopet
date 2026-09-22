import { cx } from '../../utils/cx'
import { Icon } from './Icon'

const ICONS = { info: 'info', success: 'check', warning: 'alert', danger: 'alert' }

/** Mensagem de feedback. tone: info · success · warning · danger */
export function Alert({ tone = 'info', title, className, children }) {
  return (
    <div className={cx('ap-alert', `ap-alert--${tone}`, className)} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={ICONS[tone]} size={20} />
      <div>
        {title && <p className="ap-alert__title">{title}</p>}
        {children && <p className="ap-alert__text">{children}</p>}
      </div>
    </div>
  )
}
