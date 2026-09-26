import { cx } from '../../utils/cx'

const PATHS = {
  heart: 'M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.5-4.5',
  pin: 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  alert: 'M12 3l9.5 17h-19L12 3zM12 10v4M12 17h.01',
  x: 'M6 6l12 12M18 6L6 18',
  upload: 'M12 15V4M7 9l5-5 5 5M4 15v5h16v-5',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  calendar: 'M5 5h14v15H5zM5 10h14M9 3v4M15 3v4',
  gift: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1.5-3-5-3-5-1s3 1 5 1zM12 7c1.5-3 5-3 5-1s-3 1-5 1z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z'
}

/**
 * Ícones de traço 2px em grade 24px; herdam currentColor.
 * A pata é o único ícone preenchido (símbolo da marca).
 */
export function Icon({ name = 'paw', size = 20, filled = false, label, className }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    className: cx('ap-icon', className),
    focusable: 'false',
    ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' })
  }

  if (name === 'paw') {
    return (
      <svg fill="currentColor" {...common}>
        <ellipse cx="6.5" cy="10" rx="1.9" ry="2.4" />
        <ellipse cx="10" cy="6" rx="1.9" ry="2.4" />
        <ellipse cx="14" cy="6" rx="1.9" ry="2.4" />
        <ellipse cx="17.5" cy="10" rx="1.9" ry="2.4" />
        <path d="M12 12c-2.8 0-5.5 3.3-5.5 5.6 0 1.6 1.2 2.4 2.6 2.4 1.2 0 1.9-.6 2.9-.6s1.7.6 2.9.6c1.4 0 2.6-.8 2.6-2.4C17.5 15.3 14.8 12 12 12z" />
      </svg>
    )
  }

  return (
    <svg
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...common}
    >
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  )
}
