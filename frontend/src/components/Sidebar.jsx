import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  FiActivity,
  FiBarChart2,
  FiClock,
  FiLogOut,
  FiMenu,
  FiMessageCircle,
  FiSettings,
  FiShield,
  FiUser,
  FiZap
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const Sidebar = ({ collapsed, onToggle, onMobileClose }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, isAdmin, logout } = useAuth()

  if (!isAuthenticated) {
    return null
  }

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: FiBarChart2 },
    { label: 'Predict', href: '/predict', icon: FiActivity },
    { label: 'History', href: '/history', icon: FiClock },
    { label: 'Chatbot', href: '/chat', icon: FiMessageCircle },
    { label: 'Profile', href: '/profile', icon: FiUser },
    { label: 'Settings', href: '/settings', icon: FiSettings },
    ...(isAdmin ? [{ label: 'Admin', href: '/admin', icon: FiShield }] : [])
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">MP</div>
        <div className="brand-copy">
          <div className="brand-title">MediPredict AI</div>
          <div className="brand-subtitle">AI Disease Prediction System</div>
        </div>
      </div>

      <button className="sidebar-toggle" type="button" onClick={onToggle}>
        <FiMenu />
        <span>{collapsed ? 'Expand' : 'Collapse'}</span>
      </button>

      <div className="sidebar-section">
        <p className="sidebar-label">Workspace</p>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
            return (
              <NavLink
                key={item.label}
                to={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onMobileClose}
              >
                <Icon />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
          <button
            type="button"
            className="sidebar-link logout"
            onClick={() => {
              logout()
              onMobileClose()
              navigate('/', { replace: true })
            }}
          >
            <FiLogOut />
            <span>Logout</span>
          </button>
        </nav>
      </div>

      <div className="sidebar-cta">
        <div>
          <h4>AI Ready</h4>
          <p>Run a new prediction with guided inputs.</p>
        </div>
        <Link className="primary-link" to="/predict" onClick={onMobileClose}>
          <FiZap /> New prediction
        </Link>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="status-dot" />
          Secure session enabled
        </div>
      </div>
    </aside>
  )
}

export default Sidebar

