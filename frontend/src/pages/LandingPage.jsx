import { Link } from 'react-router-dom'
import { FiShield, FiTrendingUp, FiZap } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const LandingPage = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const isLoggedIn = isAuthenticated && !isLoading

  return (
    <div className="page-grid">
      <section className="grid-span">
        <div className="hero hero-primary">
          <div className="hero-content">
            <p>AI Disease Prediction</p>
            <h2>Predict likely conditions with clinical-grade confidence</h2>
            <span>Secure, explainable, and designed for fast symptom-based insights.</span>
            <div className="hero-metrics">
              <div>
                <h4>Secure sessions</h4>
                <strong>Encrypted</strong>
              </div>
              <div>
                <h4>Model accuracy</h4>
                <strong>94%</strong>
              </div>
              <div>
                <h4>Insights</h4>
                <strong>Actionable</strong>
              </div>
            </div>
          </div>
          <div className="hero-actions">
            {isLoggedIn ? (
              <>
                <Link className="primary-button" to="/dashboard">
                  Go to Dashboard
                </Link>
                <Link className="ghost-button" to="/predict">
                  New Prediction
                </Link>
              </>
            ) : (
              <>
                <Link className="primary-button" to="/login">
                  Login
                </Link>
                <Link className="ghost-button" to="/register">
                  Sign Up
                </Link>
              </>
            )}
            <div className="trust-message">
              <FiShield />
              Your data is encrypted and private.
            </div>
          </div>
        </div>
      </section>

      <section className="grid-span">
        <div className="protocol-grid">
          <div>
            <FiShield />
            <h4>Secure sessions</h4>
            <p>HIPAA-aware storage, encrypted access, and role-based controls.</p>
          </div>
          <div>
            <FiTrendingUp />
            <h4>Model accuracy</h4>
            <p>Evidence-backed scoring tuned for consistent clinical-grade outputs.</p>
          </div>
          <div>
            <FiZap />
            <h4>Insights</h4>
            <p>Clear next steps and history tracking after every prediction.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
