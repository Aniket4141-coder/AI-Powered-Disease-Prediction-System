import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiArrowRight, FiCheckCircle, FiShield, FiUser } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({ email: '', password: '', form: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const messageTimerRef = useRef(null)
  const redirectTimerRef = useRef(null)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const redirectTo = useMemo(() => {
    const from = location.state?.from
    return from?.pathname || '/dashboard'
  }, [location.state])

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthenticated, navigate, redirectTo])

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current)
      }
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!message.text || message.type === 'success') return undefined
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current)
    }
    messageTimerRef.current = window.setTimeout(() => {
      setMessage({ type: '', text: '' })
    }, 3000)
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current)
      }
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current)
      }
    }
  }, [message])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: value
    }))
    setErrors((prev) => ({
      ...prev,
      [name]: '',
      form: ''
    }))
    setMessage({ type: '', text: '' })
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current)
    }
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (loading) return

    const nextErrors = { email: '', password: '', form: '' }
    const trimmedEmail = form.email.trim().toLowerCase()
    const passwordValue = form.password

    if (!trimmedEmail) {
      nextErrors.email = 'Email is required.'
    } else if (!emailRegex.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address.'
    }

    if (!passwordValue) {
      nextErrors.password = 'Password is required.'
    } else if (passwordValue.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.'
    }

    if (nextErrors.email || nextErrors.password) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: passwordValue })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.error) {
        setMessage({
          type: 'error',
          text: 'Invalid email or password'
        })
        return
      }
      const userData = payload?.user || payload
      if (userData?.id) {
        setMessage({
          type: 'success',
          text: 'Login successful! Redirecting...'
        })
        redirectTimerRef.current = window.setTimeout(() => {
          login(userData)
          navigate(redirectTo, { replace: true })
        }, 1400)
      } else {
        setMessage({
          type: 'error',
          text: 'Invalid email or password'
        })
      }
    } catch (error) {
      console.error('Login API error', error)
      setMessage({
        type: 'error',
        text: 'Invalid email or password'
      })
    } finally {
      setLoading(false)
    }
  }

  const isSubmitDisabled = loading || !form.email.trim() || !form.password

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
            <button type="button" className="active">
              Sign in
            </button>
            <Link to="/register">Create account</Link>
          </div>

          <form className="auth-form-fields" onSubmit={handleSubmit}>
            <label>
              Email Address
              <input
                type="email"
                name="email"
                placeholder="you@domain.com"
                value={form.email}
                onChange={handleChange}
                required
              />
              {errors.email && <span className="auth-error">{errors.email}</span>}
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                placeholder="********"
                value={form.password}
                onChange={handleChange}
                required
              />
              {errors.password && <span className="auth-error">{errors.password}</span>}
            </label>

            {message.text && (
              <div className={`auth-feedback-message ${message.type}`}>
                {message.text}
              </div>
            )}

            <button className={`primary-button ${loading ? 'is-loading' : ''}`} type="submit" disabled={isSubmitDisabled}>
              {loading && <span className="button-spinner" aria-hidden="true" />}
              {loading ? 'Logging in...' : 'Login to dashboard'}
              <FiArrowRight />
            </button>
          </form>

          <div className="auth-footer">
            <p>New to MediPredict AI?</p>
            <Link to="/register">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
