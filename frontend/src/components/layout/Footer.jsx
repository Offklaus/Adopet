import { Link } from 'react-router-dom'
import { Icon } from '../ui'

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="stack" style={{ maxWidth: 360 }}>
            <Link to="/" className="ap-nav__brand">
              <Icon name="paw" size={26} />
              <span>AdoPet</span>
            </Link>
            <p className="t-body-sm t-muted">
              Conectamos cães e gatos que esperam por um lar a pessoas que querem adotar ou ajudar com doações.
            </p>
          </div>
          <nav aria-label="Rodapé">
            <ul className="footer__links">
              <li><Link to="/adotar">Adotar</Link></li>
              <li><Link to="/#como-funciona">Como funciona</Link></li>
              <li><Link to="/doar">Doar</Link></li>
              <li><Link to="/admin/animais">Área administrativa</Link></li>
            </ul>
          </nav>
        </div>
        <p className="footer__bottom t-body-sm">© {new Date().getFullYear()} AdoPet</p>
      </div>
    </footer>
  )
}
