import { NavLink } from 'react-router-dom'
import { cx } from '../../utils/cx'

const ITEMS = [
  { to: '/admin/animais', label: 'Animais' },
  { to: '/admin/pedidos', label: 'Pedidos de adoção' },
  { to: '/admin/doacoes', label: 'Doações' }
]

/** Abas da área administrativa, no topo de cada página dela. */
export function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Área administrativa">
      {ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => cx('admin-nav__link', isActive && 'is-active')}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
