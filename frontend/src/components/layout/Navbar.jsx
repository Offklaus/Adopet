import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
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

/** Menu "Minha conta": nome e e-mail, Meus pedidos e Sair. Fecha com clique fora, Esc ou troca de página. */
function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div className="ap-nav__account ap-nav__cta" ref={containerRef}>
      <button
        type="button"
        className="ap-btn ap-btn--ghost ap-btn--sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Minha conta (${user.name})`}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="user" size={18} />
        <span className="ap-nav__account-label">Minha conta</span>
      </button>
      {open && (
        <div className="ap-nav__dropdown" role="menu">
          <p className="ap-nav__dropdown-head">
            {user.name}
            <span>{user.email}</span>
          </p>
          <Link role="menuitem" to="/meus-pedidos" className="ap-nav__dropdown-item">Meus pedidos</Link>
          {user.isAdmin && (
            <Link role="menuitem" to="/admin" className="ap-nav__dropdown-item">Área administrativa</Link>
          )}
          <button role="menuitem" type="button" className="ap-nav__dropdown-item" onClick={onLogout}>Sair</button>
        </div>
      )}
    </div>
  )
}

/** Cabeçalho: marca, links principais, tema e as ações "Doar" e "Quero adotar". */
export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const location = useLocation()
  const firstName = user?.name.split(' ')[0]
  // Depois de entrar, volta para a página em que a pessoa estava.
  const loginHref = location.pathname === '/entrar' ? '/entrar' : `/entrar?voltar=${encodeURIComponent(location.pathname + location.search)}`

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
          {user ? (
            <AccountMenu user={user} onLogout={logout} />
          ) : (
            <Button variant="ghost" size="sm" to={loginHref} className="ap-nav__cta">Entrar</Button>
          )}
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
        {user ? (
          <>
            <Button variant="outline" to="/meus-pedidos" full>Meus pedidos</Button>
            {user.isAdmin && <Button variant="outline" to="/admin" full>Área administrativa</Button>}
            <Button variant="ghost" onClick={logout} full>Sair ({firstName})</Button>
          </>
        ) : (
          <Button variant="outline" to={loginHref} full>Entrar ou criar conta</Button>
        )}
      </div>
    </header>
  )
}
