import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NotFoundPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()
  const target = isAuthenticated ? '/dashboard' : '/login'

  useEffect(() => {
    if (isLoading) return
    const timer = setTimeout(() => {
      navigate(target, { replace: true })
    }, 2000)
    return () => clearTimeout(timer)
  }, [isLoading, navigate, target])

  return (
    <div className="auth-layout">
      <div className="auth-card not-found">
        <h2>Page not found</h2>
        <p>This route is not available. Redirecting you in a moment.</p>
        <Link className="primary-button" to={target}>Go to dashboard</Link>
      </div>
    </div>
  )
}

export default NotFoundPage
