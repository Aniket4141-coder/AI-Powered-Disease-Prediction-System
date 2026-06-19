import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiBell, FiCalendar, FiMoon, FiSearch, FiSun, FiZap, FiLogIn } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const Topbar = ({ onMobileToggle, meta, theme, onThemeToggle }) => {
  const location = useLocation()
  const hideNavbarRoutes = ['/login', '/register']
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()
  const name = user?.name || user?.full_name || meta?.user?.name || 'Care Member'
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })

  if (hideNavbarRoutes.includes(location.pathname)) {
    return null
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-toggle" type="button" onClick={onMobileToggle}>
          <span />
          <span />
          <span />
        </button>
        <div className="topbar-title">
          <p>Healthcare Command Center</p>
          <h1>{meta?.title || 'AI Disease Prediction'}</h1>
        </div>
      </div>

      <div className="topbar-right">
        {isAuthenticated && (
          <>
            <div className="topbar-search">
              <FiSearch />
              <input list="global-search" placeholder="Search patients, symptoms, diseases" />
              <datalist id="global-search">
                <option value="Hypertension" />
                <option value="Migraine" />
                <option value="Dengue" />
                <option value="Recent predictions" />
                <option value="Patient profile" />
              </datalist>
            </div>

            <div className="topbar-date">
              <FiCalendar />
              <span>{today}</span>
            </div>

            <Link className="topbar-action" to="/predict">
              <FiZap />
              New prediction
            </Link>
          </>
        )}

        {!isAuthenticated && (
          <div className="topbar-auth">
            <Link className="topbar-login" to="/login">
              <FiLogIn /> Login
            </Link>
            <Link className="topbar-action" to="/register">
              Sign Up
            </Link>
          </div>
        )}

        {isAuthenticated && (
          <div className="topbar-auth">
            <button
              className="topbar-action"
              type="button"
              onClick={() => {
                logout()
                navigate('/', { replace: true })
              }}
            >
              Logout
            </button>
          </div>
        )}

        {isAuthenticated && (
          <button className="icon-button" type="button" aria-label="Notifications">
            <FiBell />
          </button>
        )}

        <button
          className="theme-toggle"
          type="button"
          onClick={onThemeToggle}
          data-theme={theme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span className="theme-icon">{theme === 'dark' ? <FiMoon /> : <FiSun />}</span>
          <span className="theme-switch" aria-hidden="true">
            <span className="theme-thumb" />
          </span>
        </button>

        {isAuthenticated && (
          <div className="topbar-profile">
            <div className="topbar-avatar">{name.slice(0, 1)}</div>
            <div>
              <p>{name}</p>
              <span>Care team</span>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default Topbar
