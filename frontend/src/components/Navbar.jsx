import { NavLink, useNavigate } from 'react-router-dom'
import { TOKEN_KEY } from '../api/client'
import styles from './Navbar.module.css'

const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/budget', label: 'Budget' },
  { to: '/expenses', label: 'Expenses' },
  { to: '/goals', label: 'Goals' },
  { to: '/reports', label: 'Reports' },
]

export default function Navbar() {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    navigate('/login')
  }

  return (
    <nav className={styles.nav}>
      <span className={styles.brand}>Student Finance</span>
      <div className={styles.links}>
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.active}` : styles.link
            }
          >
            {l.label}
          </NavLink>
        ))}
      </div>
      <button className={styles.logout} onClick={handleLogout}>
        Logout
      </button>
    </nav>
  )
}
