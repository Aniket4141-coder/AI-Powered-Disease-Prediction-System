import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { FiActivity, FiSearch, FiShield, FiZap } from 'react-icons/fi'
import GlassCard from '../components/GlassCard'
import LoadingOverlay from '../components/LoadingOverlay'
import { formatTitleCase } from '../lib/formatters'
import { useAuth } from '../context/AuthContext'

const PredictPage = ({ data }) => {
  const navigate = useNavigate()
  const categories = data.categories || {}
  const { isAuthenticated, user } = useAuth()
  const [selected, setSelected] = useState(new Set())
  const [removing, setRemoving] = useState(new Set())
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [symptoms, setSymptoms] = useState([])
  const [symptomsError, setSymptomsError] = useState(false)
  const [symptomsLoading, setSymptomsLoading] = useState(true)
  const abortRef = useRef(null)

  const loadSymptoms = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller
    setSymptomsError(false)
    setSymptomsLoading(true)

    fetch('/api/symptoms', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (controller.signal.aborted) return
        if (Array.isArray(data)) {
          setSymptoms(data)
          setSymptomsError(false)
        } else {
          setSymptoms([])
          setSymptomsError(true)
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        console.error('Symptoms fetch error', error)
        setSymptoms([])
        setSymptomsError(true)
      })
      .finally(() => {
        if (controller.signal.aborted) return
        setSymptomsLoading(false)
      })
  }, [])

  useEffect(() => {
    loadSymptoms()
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [loadSymptoms])

  const resolvedCategories = useMemo(() => {
    if (Object.keys(categories).length) return categories
    if (symptoms.length) return { 'All Symptoms': symptoms }
    return {}
  }, [categories, symptoms])

  const allSymptoms = useMemo(() => {
    if (symptoms.length) return symptoms
    return Object.values(categories).flat()
  }, [categories, symptoms])

  const suggestions = useMemo(() => {
    if (query.trim().length < 1) return []
    const normalizedQuery = query.trim().toLowerCase()
    return allSymptoms
      .filter((symptom) => !selected.has(symptom))
      .filter((symptom) => symptom.replace(/_/g, ' ').toLowerCase().includes(normalizedQuery))
      .slice(0, 6)
  }, [allSymptoms, query, selected])

  useEffect(() => {
    if (suggestions.length === 0) {
      setActiveSuggestion(-1)
    } else {
      setActiveSuggestion(0)
    }
  }, [suggestions])

  const toggleSymptom = (symptom) => {
    const next = new Set(selected)
    if (next.has(symptom)) {
      if (removing.has(symptom)) {
        setRemoving((prev) => {
          const updated = new Set(prev)
          updated.delete(symptom)
          return updated
        })
        return
      }
      removeSymptom(symptom)
      return
    } else {
      next.add(symptom)
    }
    setSelected(next)
  }

  const addSymptom = (symptom) => {
    if (selected.has(symptom)) return
    if (removing.has(symptom)) {
      setRemoving((prev) => {
        const updated = new Set(prev)
        updated.delete(symptom)
        return updated
      })
    }
    setSelected((prev) => new Set(prev).add(symptom))
  }

  const removeSymptom = (symptom) => {
    if (!selected.has(symptom) || removing.has(symptom)) return
    setRemoving((prev) => new Set(prev).add(symptom))
    window.setTimeout(() => {
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(symptom)
        return next
      })
      setRemoving((prev) => {
        const next = new Set(prev)
        next.delete(symptom)
        return next
      })
    }, 180)
  }

  const clearSelection = () => {
    if (selected.size === 0) return
    setRemoving(new Set(selected))
    window.setTimeout(() => {
      setSelected(new Set())
      setRemoving(new Set())
    }, 180)
  }

  const selectedList = useMemo(() => Array.from(selected), [selected])
  const displayCount = Math.max(selected.size - removing.size, 0)
  const accuracy = data.stats?.accuracy || '94%'
  const totalPredictions = data.stats?.predictions || '12.4k'
  const satisfaction = data.stats?.satisfaction || '4.9/5'

  const relatedSuggestions = useMemo(() => {
    if (!selected.size) return []
    const related = new Set()
    Object.entries(resolvedCategories).forEach(([, symptoms]) => {
      const hasSelected = symptoms.some((symptom) => selected.has(symptom))
      if (!hasSelected) return
      symptoms.forEach((symptom) => {
        if (!selected.has(symptom)) related.add(symptom)
      })
    })
    return Array.from(related).slice(0, 6)
  }, [resolvedCategories, selected])

  const getHighlightedLabel = (symptom) => {
    const formatted = formatTitleCase(symptom)
    const needle = query.trim()
    if (!needle) return formatted
    const index = formatted.toLowerCase().indexOf(needle.toLowerCase())
    if (index === -1) return formatted
    const before = formatted.slice(0, index)
    const match = formatted.slice(index, index + needle.length)
    const after = formatted.slice(index + needle.length)
    return (
      <>
        {before}
        <span className="suggestion-highlight">{match}</span>
        {after}
      </>
    )
  }

  const handlePredict = async () => {
    if (selected.size === 0) {
      toast.error('Please select at least 1 symptom.')
      return
    }
    if (!user?.id) {
      toast.error('Please log in again to continue.')
      return
    }

    setLoading(true)
    const payload = { symptoms: selectedList, user_id: user.id }

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      })

      const resultData = await response.json().catch(() => ({}))
      if (!response.ok || resultData?.error) {
        if (resultData?.error === 'user_id required') {
          toast.error('Please log in to continue.')
          navigate('/login', { replace: true })
          return
        }
        console.error('Predict API failed', response.status, resultData?.error)
        toast.error(resultData?.error || 'Prediction failed. Please try again.')
        return
      }

      const topResult =
        (Array.isArray(resultData?.results) && resultData.results[0]) ||
        (Array.isArray(resultData?.predictions) && resultData.predictions[0]) ||
        (Array.isArray(resultData?.predicted) && resultData.predicted[0]) ||
        []

      const prediction = resultData?.prediction ?? topResult[0] ?? 'Unknown'
      const confidence = (resultData?.confidence ?? Number(topResult[1])) || 0

      navigate('/result', { state: { resultData, symptoms: selectedList } })
    } catch (error) {
      console.error('Predict API error', error)
      toast.error('Prediction failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchKeyDown = (event) => {
    if (!suggestions.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSuggestion((prev) => (prev + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSuggestion((prev) => (prev - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const selectedSuggestion = suggestions[activeSuggestion] || suggestions[0]
      if (selectedSuggestion) {
        addSymptom(selectedSuggestion)
        setQuery('')
      }
    }
  }

  const showNoResults = !symptomsError && query.trim().length >= 1 && suggestions.length === 0
  const disablePrediction = !isAuthenticated || loading || selected.size === 0

  return (
    <div className="page-grid">
      <section className="grid-span">
        <div className="hero hero-secondary">
          <div className="hero-content">
            <p>Symptom-Based Prediction</p>
            <h2>Surface likely conditions with confidence-ranked results.</h2>
            <span>Choose symptoms, review AI insights, and keep your history in one place.</span>
            <div className="hero-metrics">
              <div>
                <h4>Model accuracy</h4>
                <strong>{accuracy}</strong>
              </div>
              <div>
                <h4>Predictions served</h4>
                <strong>{totalPredictions}</strong>
              </div>
              <div>
                <h4>Patient rating</h4>
                <strong>{satisfaction}</strong>
              </div>
            </div>
          </div>
          <div className="hero-actions">
            <button
              className={`primary-button ${loading ? 'is-loading' : ''}`}
              type="button"
              onClick={handlePredict}
              disabled={disablePrediction}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  Predicting...
                </>
              ) : (
                'Run Prediction'
              )}
            </button>
            <button className="ghost-button" type="button" onClick={clearSelection}>
              Clear selection
            </button>
            {!isAuthenticated && (
              <div className="trust-message">
                <FiShield />
                Please login to continue.
              </div>
            )}
            <div className="trust-message">
              <FiShield />
              Your data is encrypted and private.
            </div>
          </div>
        </div>
      </section>

      <GlassCard title="Symptom Search" subtitle="Smart suggestions with auto-complete" className="grid-span">
        <div className="search-row">
          <FiSearch />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search symptoms"
            onKeyDown={handleSearchKeyDown}
          />
          <div className="selected-count">
            <span>Selected</span>
            <strong>{displayCount}</strong>
          </div>
        </div>
        {symptomsLoading && !symptomsError && (
          <div className="symptom-loading">Loading symptom library...</div>
        )}
        {symptomsError && (
          <div className="symptom-fallback" role="status">
            <span>Unable to load symptoms</span>
            <button
              type="button"
              className="ghost-button symptom-retry"
              onClick={loadSymptoms}
              disabled={symptomsLoading}
            >
              {symptomsLoading ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}
        {suggestions.length > 0 && (
          <div className="suggestions suggestions-panel" role="listbox">
            {suggestions.map((symptom) => (
              <button
                key={symptom}
                type="button"
                role="option"
                aria-selected={selected.has(symptom)}
                className={`${selected.has(symptom) ? 'is-selected' : ''} ${symptom === suggestions[activeSuggestion] ? 'is-active' : ''}`}
                onClick={() => {
                  addSymptom(symptom)
                  setQuery('')
                }}
              >
                {getHighlightedLabel(symptom)}
              </button>
            ))}
          </div>
        )}
        {showNoResults && <div className="no-results">No results found</div>}
        {relatedSuggestions.length > 0 && (
          <div className="ai-suggestions">
            <div className="ai-suggestions-header">
              <FiActivity />
              <span>AI suggestions based on your selection</span>
            </div>
            <div className="ai-suggestions-chips">
              {relatedSuggestions.map((symptom) => (
                <button
                  key={symptom}
                  type="button"
                  className={`ai-chip ${selected.has(symptom) ? 'is-selected' : ''}`}
                  onClick={() => addSymptom(symptom)}
                >
                  {formatTitleCase(symptom)}
                </button>
              ))}
            </div>
          </div>
        )}
        {selectedList.length > 0 ? (
          <div className="selected-chips" aria-live="polite">
            {selectedList.map((symptom) => {
              const formatted = formatTitleCase(symptom)
              const isRemoving = removing.has(symptom)
              return (
                <span key={symptom} className={`chip ${isRemoving ? 'is-removing' : ''}`}>
                  {formatted}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => removeSymptom(symptom)}
                    aria-label={`Remove ${formatted}`}
                  >
                    ×
                  </button>
                </span>
              )
            })}
          </div>
        ) : (
          <div className="chips-empty">
            <div className="chips-empty-icon">
              <FiActivity />
            </div>
            <div>
              <h4>Start by choosing symptoms</h4>
              <p>Search or browse categories to build your AI-ready profile.</p>
            </div>
          </div>
        )}
      </GlassCard>

      <section className="grid-span symptom-grid">
        {Object.entries(resolvedCategories).map(([category, symptoms]) => (
          <div key={category} className="symptom-category">
            <div className="symptom-header">
              <h3>{category}</h3>
              <span>{symptoms.length} symptoms</span>
            </div>
            <div className="symptom-list">
              {symptoms.map((symptom) => (
                <label
                  key={symptom}
                  className={`symptom-card ${
                    selected.has(symptom) && !removing.has(symptom) ? 'active' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(symptom) && !removing.has(symptom)}
                    onChange={() => toggleSymptom(symptom)}
                  />
                  <span>{formatTitleCase(symptom)}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </section>

      <GlassCard title="Prediction Protocol" subtitle="Designed for clinical clarity" className="grid-span">
        <div className="protocol-grid">
          <div>
            <FiZap />
            <h4>Real-time scoring</h4>
            <p>Instant probabilistic modeling with symptom weighting.</p>
          </div>
          <div>
            <FiShield />
            <h4>Secure workflow</h4>
            <p>All predictions remain private within your account.</p>
          </div>
          <div>
            <FiSearch />
            <h4>Explainable AI</h4>
            <p>Each prediction includes evidence-based context.</p>
          </div>
        </div>
      </GlassCard>

      <GlassCard title="AI Insights" subtitle="How we interpret your inputs" className="grid-span">
        <div className="ai-mini-insights">
          <div>
            <h4>Pattern recognition</h4>
            <p>We compare your symptoms against historical clinical patterns and outcomes.</p>
          </div>
          <div>
            <h4>Weighted evidence</h4>
            <p>Symptoms are prioritized by severity, rarity, and correlation strength.</p>
          </div>
          <div>
            <h4>Next best action</h4>
            <p>We surface the most likely conditions with clear confidence guidance.</p>
          </div>
        </div>
      </GlassCard>

      <LoadingOverlay show={loading} />
    </div>
  )
}

export default PredictPage
