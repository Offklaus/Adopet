import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { cx } from '../../utils/cx'
import { Button, Icon } from '../ui'

const LINKS = [
  { to: '/adotar', label: 'Adotar' },
  { to: '/#como-funciona', label: 'Como funciona' },
  { to: '/doar', label: 'Campanhas' }
]

function linkClass({ isActive }) {
  return cx('ap-nav__link', isActive && 'is-active')
}

/** Cabeçalho: marca, links principais, tema e as ações "Doar" e "Quero adotar". */
export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  // Fecha o menu mobile ao trocar de página.
  useEffect(() => setMenuOpen(false), [location.pathname, location.hash])

  const links = LINKS.map((link) => (
    <li key={link.to}>
      {link.to.includes('#') ? (
        <Link to={link.to} className="ap-nav__link">{link.label}</Link>
      ) : (
        <NavLink to={link.to} className={linkClass}>{link.label}</NavLink>
      )}
    </li>
  ))

  return (
    <header className="ap-nav">
      <div className="ap-nav__bar">
        <Link className="ap-nav__brand" to="/">
          <Icon name="paw" size={26} />
          <span>AdoPet</span>
        </Link>

        <nav aria-label="Principal">
          <ul className="ap-nav__links">{links}</ul>
        </nav>

        <div className="ap-nav__actions">
          <button
            type="button"
            className="ap-nav__icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
          </button>
          <Button variant="donate" size="sm" icon="heart" to="/doar" className="ap-nav__cta">Doar</Button>
          <Button variant="primary" size="sm" to="/adotar" className="ap-nav__cta">Quero adotar</Button>
          <button
            type="button"
            className="ap-nav__icon-btn ap-nav__menu-btn"
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      <div id="menu-mobile" className={cx('ap-nav__mobile', menuOpen && 'is-open')}>
        <ul className="ap-nav__links" style={{ flexDirection: 'column' }}>{links}</ul>
        <Button variant="donate" icon="heart" to="/doar" full>Doar</Button>
        <Button variant="primary" to="/adotar" full>Quero adotar</Button>
      </div>
    </header>
  )
}
