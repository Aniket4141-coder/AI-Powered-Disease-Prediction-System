import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'

const PublicLayout = ({ meta }) => {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const storedTheme = window.sessionStorage.getItem('theme-preference') || 'light'
    setTheme(storedTheme)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.sessionStorage.setItem('theme-preference', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className="app-content">
      <Topbar
        onMobileToggle={() => {}}
        meta={meta}
        theme={theme}
        onThemeToggle={toggleTheme}
      />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

export default PublicLayout
