import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiArrowRight, FiCheckCircle, FiShield, FiUser } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const Register = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({ name: '', email: '', password: '', form: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const messageTimerRef = useRef(null)
  const redirectTimerRef = useRef(null)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

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

    const nextErrors = { name: '', email: '', password: '', form: '' }
    const trimmedName = form.name.trim()
    const trimmedEmail = form.email.trim().toLowerCase()
    const passwordValue = form.password

    if (!trimmedName) {
      nextErrors.name = 'Name is required.'
    } else if (trimmedName.length < 3) {
      nextErrors.name = 'Name must be at least 3 characters.'
    }

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

    if (nextErrors.name || nextErrors.email || nextErrors.password) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)

    const profile = {
      name: trimmedName,
      email: trimmedEmail,
      password: passwordValue
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessage({
          type: 'error',
          text: payload?.error || 'Registration failed. Please try again.'
        })
        return
      }
      setMessage({
        type: 'success',
        text: 'Registration successful!'
      })
      redirectTimerRef.current = window.setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1400)
    } catch (error) {
      console.error('Register API error', error)
      setMessage({
        type: 'error',
        text: 'Registration failed. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const isSubmitDisabled =
    loading || !form.name.trim() || !form.email.trim() || !form.password

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
            <Link to="/login">Sign in</Link>
            <button type="button" className="active">
              Create account
            </button>
          </div>

          <form className="auth-form-fields" onSubmit={handleSubmit}>
            <label>
              Full Name
              <input
                type="text"
                name="name"
                placeholder="Alex Morgan"
                value={form.name}
                onChange={handleChange}
                required
              />
              {errors.name && <span className="auth-error">{errors.name}</span>}
            </label>
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
              {loading ? 'Creating account...' : 'Create my account'}
              <FiArrowRight />
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account?</p>
            <Link to="/login">Sign in instead</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
