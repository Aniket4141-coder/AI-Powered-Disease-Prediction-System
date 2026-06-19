import { Link } from 'react-router-dom'
import { FiShield, FiZap } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const HomePage = () => {
  const { isAuthenticated } = useAuth()

  return (
    <div className="page-grid">
      <section className="grid-span">
        <div className="hero hero-primary">
          <div className="hero-content">
            <p>AI Disease Prediction</p>
            <h2>Predict likely conditions with clinical-grade confidence.</h2>
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
            {isAuthenticated ? (
              <Link className="primary-button" to="/dashboard">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link className="primary-button" to="/login">
                  Login to start
                </Link>
                <Link className="ghost-button" to="/register">
                  Create an account
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
            <FiZap />
            <h4>Fast predictions</h4>
            <p>Run AI-backed predictions in seconds once you are logged in.</p>
          </div>
          <div>
            <FiShield />
            <h4>Account protected</h4>
            <p>Access to your dashboard, history, and profile stays secured.</p>
          </div>
          <div>
            <FiZap />
            <h4>Actionable history</h4>
            <p>Review trends and outcomes from prior predictions anytime.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
