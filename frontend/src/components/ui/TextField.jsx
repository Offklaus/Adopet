import { useId } from 'react'
import { cx } from '../../utils/cx'
import { Icon } from './Icon'

/**
 * Campo com rótulo visível, texto de apoio e erro.
 * Vira <select> com `options` e <textarea> com `multiline`.
 */
export function TextField({ label, hint, error, icon, options, multiline, className, id, ...rest }) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const hintId = `${fieldId}-hint`

  const controlProps = {
    id: fieldId,
    className: 'ap-field__control',
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': hint || error ? hintId : undefined,
    ...rest
  }

  let control
  if (options) {
    control = (
      <select {...controlProps}>
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value
          const text = typeof option === 'string' ? option : option.label
          return <option key={value} value={value}>{text}</option>
        })}
      </select>
    )
  } else if (multiline) {
    control = <textarea rows={4} {...controlProps} />
  } else {
    control = <input type="text" {...controlProps} />
  }

  return (
    <div className={cx('ap-field', error && 'has-error', icon && 'has-icon', options && 'is-select', className)}>
      {label && <label htmlFor={fieldId} className="ap-field__label">{label}</label>}
      <div className="ap-field__wrap">
        {icon && <Icon name={icon} size={18} className="ap-field__icon" />}
        {control}
      </div>
      {(error || hint) && (
        <p id={hintId} className="ap-field__hint">
          {error && <Icon name="alert" size={14} />}
          {error || hint}
        </p>
      )}
    </div>
  )
}
