import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const AppShell = ({ children, meta }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const stored = window.sessionStorage.getItem('sidebar-collapsed')
    setCollapsed(stored === 'true')
  }, [])

  useEffect(() => {
    const storedTheme = window.sessionStorage.getItem('theme-preference') || 'light'
    setTheme(storedTheme)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.sessionStorage.setItem('theme-preference', theme)
  }, [theme])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    window.sessionStorage.setItem('sidebar-collapsed', next)
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="app-content">
        <Topbar
          onMobileToggle={() => setMobileOpen((prev) => !prev)}
          meta={meta}
          theme={theme}
          onThemeToggle={toggleTheme}
        />
        <main className="app-main">
          {children}
        </main>
      </div>
      {mobileOpen && <button className="mobile-overlay" type="button" onClick={() => setMobileOpen(false)} />}
    </div>
  )
}

export default AppShell
