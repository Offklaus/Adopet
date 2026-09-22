import { Link } from 'react-router-dom'
import { cx } from '../../utils/cx'
import { Icon } from './Icon'

/**
 * Botão em pílula. Use `primary` uma vez por tela; `donate` só para doar.
 * `to` renderiza um Link do router, `href` um <a> comum.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  full = false,
  to,
  href,
  className,
  children,
  ...rest
}) {
  const iconSize = size === 'lg' ? 20 : 18
  const classes = cx('ap-btn', `ap-btn--${variant}`, `ap-btn--${size}`, full && 'ap-btn--full', className)
  const content = (
    <>
      {icon && <Icon name={icon} size={iconSize} />}
      <span>{children}</span>
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </>
  )

  if (to && !rest.disabled) {
    return <Link to={to} className={classes} {...rest}>{content}</Link>
  }
  if (href && !rest.disabled) {
    return <a href={href} className={classes} {...rest}>{content}</a>
  }
  return <button type="button" className={classes} {...rest}>{content}</button>
}
