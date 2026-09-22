import { useState } from 'react'
import { cx } from '../../utils/cx'
import { Badge, Button, Icon } from '../ui'

const STATUS = {
  available: null,
  reserved: { tone: 'warning', label: 'Em processo' },
  adopted: { tone: 'success', label: 'Adotado' }
}

/**
 * Card do pet no grid de adoção: foto 4:3, favoritar, nome, metadados,
 * até 3 badges e o botão "Conhecer <nome>".
 */
export function PetCard({
  name,
  age,
  sex,
  size,
  location,
  tags = [],
  photo,
  photoAlt,
  favorite = false,
  status = 'available',
  onFavorite,
  onAdopt,
  to,
  className
}) {
  const [isFavorite, setIsFavorite] = useState(favorite)
  const badge = STATUS[status]
  const meta = [age, sex, size].filter(Boolean).join(' · ')
  const adopted = status === 'adopted'

  function toggleFavorite() {
    const next = !isFavorite
    setIsFavorite(next)
    onFavorite?.(next)
  }

  return (
    <article className={cx('ap-pet', className)}>
      <div className="ap-pet__media">
        {photo ? (
          <img src={photo} alt={photoAlt || `Foto de ${name}`} loading="lazy" />
        ) : (
          <div className="ap-pet__ph" aria-hidden="true">
            <Icon name="paw" size={48} />
          </div>
        )}
        {badge && <Badge tone={badge.tone} className="ap-pet__status">{badge.label}</Badge>}
        <button
          type="button"
          className={cx('ap-pet__fav', isFavorite && 'is-on')}
          aria-pressed={isFavorite}
          aria-label={`${isFavorite ? 'Remover' : 'Favoritar'} ${name}`}
          onClick={toggleFavorite}
        >
          <Icon name="heart" size={20} filled={isFavorite} />
        </button>
      </div>

      <div className="ap-pet__body">
        <h3 className="ap-pet__name">{name}</h3>
        {meta && <p className="ap-pet__meta">{meta}</p>}
        {location && (
          <p className="ap-pet__loc">
            <Icon name="pin" size={16} />
            {location}
          </p>
        )}
        {tags.length > 0 && (
          <div className="ap-pet__tags">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} tone="secondary">{tag}</Badge>
            ))}
          </div>
        )}
        <Button
          variant={badge ? 'outline' : 'primary'}
          full
          to={to}
          onClick={onAdopt}
          disabled={adopted || undefined}
        >
          {adopted ? 'Já tem um lar' : `Conhecer ${name}`}
        </Button>
      </div>
    </article>
  )
}
