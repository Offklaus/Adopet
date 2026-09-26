import { cx } from '../../utils/cx'
import { Icon } from './Icon'

// Patas em marca d'água: [esquerda %, topo %, tamanho px, rotação °], como no design system.
const PAWS = [[4, 58, 150, -18], [26, 8, 110, 14], [44, 70, 90, -8], [70, 16, 170, 20], [88, 64, 120, -24]]

/**
 * Faixa azul de marca (a cara dos posts do Instagram). Um por página.
 * `title`: linhas; `{ text, accent: true }` pinta a linha em limão. Sobre o azul, use botões
 * `secondary` (adotar) e `donate` (doar): `primary` some no fundo.
 * `image`: foto (sem ela, uma pata); `false` remove a coluna.
 */
export function Hero({ title = [], eyebrow, subtitle, actions, image, imageAlt = '', label, className, children }) {
  return (
    <section className={cx('ap-hero', className)} aria-label={label}>
      <div className="ap-hero__paws" aria-hidden="true">
        {PAWS.map(([left, top, size, rotate]) => (
          <span key={`${left}-${top}`} style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, transform: `rotate(${rotate}deg)` }}>
            <Icon name="paw" size={size} />
          </span>
        ))}
      </div>
      <div>
        {eyebrow && <p className="ap-hero__eyebrow">{eyebrow}</p>}
        <h1 className="ap-hero__title">
          {title.map((line) => {
            const { text, accent } = typeof line === 'string' ? { text: line } : line
            return <span key={text} className={accent ? 'is-accent' : undefined}>{text}</span>
          })}
        </h1>
        {subtitle && <p className="ap-hero__sub">{subtitle}</p>}
        {actions && <div className="ap-hero__actions">{actions}</div>}
        {children}
      </div>
      {image !== false && (
        <div className="ap-hero__media">
          {image ? <img src={image} alt={imageAlt} /> : <Icon name="paw" size={96} />}
        </div>
      )}
    </section>
  )
}
