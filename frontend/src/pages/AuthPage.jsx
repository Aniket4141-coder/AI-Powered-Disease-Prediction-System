import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { FiArrowRight, FiCheckCircle, FiShield, FiUser } from 'react-icons/fi'

const AuthPage = ({ initialMode = 'login' }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [mode, setMode] = useState(initialMode)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const modeParam = params.get('mode')
    if (location.pathname === '/register' || modeParam === 'signup') {
      setMode('signup')
      return
    }
    if (location.pathname === '/login' || modeParam === 'login') {
      setMode('login')
    }
  }, [location.pathname, location.search])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(event.currentTarget)
      const payload = {
        name: formData.get('name')?.toString().trim() || '',
        email: formData.get('email')?.toString().trim().toLowerCase() || '',
        password: formData.get('password')?.toString() || ''
      }
      const endpoint = mode === 'login' ? '/api/login' : '/api/register'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data?.error || 'Authentication failed. Try again.')
        return
      }
      if (mode === 'login') {
        navigate('/dashboard', { replace: true })
      } else {
        toast.success('Registration successful. Please sign in.')
        navigate('/login', { replace: true })
      }
    } catch (error) {
      console.error('Auth error', error)
      toast.error('Unable to reach the server. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-panel auth-info">
          <div className="auth-brand">
            <span className="brand-pulse" />
            <div>
              <h1>MediPredict AI</h1>
              <p>Premium AI-powered disease prediction</p>
            </div>
          </div>
          <div className="auth-highlights">
            <div>
              <FiShield />
              <div>
                <h4>Clinical-grade security</h4>
                <p>HIPAA-inspired data protection and encrypted sessions.</p>
              </div>
            </div>
            <div>
              <FiCheckCircle />
              <div>
                <h4>Actionable insights</h4>
                <p>Explainable AI summaries with confidence scoring.</p>
              </div>
            </div>
            <div>
              <FiUser />
              <div>
                <h4>Personalized tracking</h4>
                <p>History trends and personalized risk monitoring.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-panel auth-form">
          <div className="auth-switch">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => setMode('signup')}
            >
              Create account
            </button>
          </div>

          <form className="auth-form-fields" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label>
                Full Name
                <input type="text" name="name" placeholder="Alex Morgan" required />
              </label>
            )}
            <label>
              Email Address
              <input type="email" name="email" placeholder="you@domain.com" required />
            </label>
            <label>
              Password
              <input type="password" name="password" placeholder="••••••••" required />
            </label>

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Processing...' : mode === 'login' ? 'Login to dashboard' : 'Create my account'}
              <FiArrowRight />
            </button>
          </form>

          <div className="auth-footer">
            <p>{mode === 'login' ? 'New to MediPredict AI?' : 'Already have an account?'}</p>
            <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Create an account' : 'Sign in instead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
