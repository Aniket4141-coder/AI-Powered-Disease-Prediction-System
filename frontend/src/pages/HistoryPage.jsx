import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiFilter, FiSearch } from 'react-icons/fi'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import GlassCard from '../components/GlassCard'
import RiskBadge from '../components/RiskBadge'
import { formatTitleCase, getRiskLevel } from '../lib/formatters'
import { useAuth } from '../context/AuthContext'

const HistoryPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [historyItems, setHistoryItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [diseaseFilter, setDiseaseFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    setError('')
    fetch(`/api/predictions/${user.id}`)
      .then((res) => res.json())
      .then((payload) => {
        if (payload?.error) {
          setError(payload.error)
          setHistoryItems([])
          return
        }
        setHistoryItems(Array.isArray(payload?.predictions) ? payload.predictions : [])
      })
      .catch((error) => {
        console.error('History API error', error)
        setError('Unable to load history.')
        setHistoryItems([])
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  const history = useMemo(() => historyItems, [historyItems])

  const timeline = useMemo(() => {
    const counts = new Map()
    history.forEach((entry) => {
      const label = entry.date ? new Date(entry.date).toLocaleDateString() : 'Unknown'
      counts.set(label, (counts.get(label) || 0) + 1)
    })
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }))
  }, [history])

  const uniqueDiseases = useMemo(() => {
    const set = new Set()
    history.forEach((entry) => {
      if (entry?.prediction) set.add(entry.prediction)
    })
    return Array.from(set)
  }, [history])

  const filteredHistory = useMemo(() => {
    return history.filter((entry) => {
      const diseaseMatches =
        diseaseFilter === 'all' || entry?.prediction === diseaseFilter
      const searchValue = searchTerm.trim().toLowerCase()
      const symptomText = Array.isArray(entry.symptoms) ? entry.symptoms.join(' ') : ''
      const searchMatches = !searchValue
        ? true
        : `${entry?.prediction || ''} ${symptomText}`.toLowerCase().includes(searchValue)
      const entryDate = entry.date ? new Date(entry.date) : null
      const fromDate = dateFrom ? new Date(dateFrom) : null
      const toDate = dateTo ? new Date(dateTo) : null
      const dateMatches =
        (!fromDate || (entryDate && entryDate >= fromDate)) &&
        (!toDate || (entryDate && entryDate <= toDate))
      return diseaseMatches && searchMatches && dateMatches
    })
  }, [history, diseaseFilter, searchTerm, dateFrom, dateTo])

  const handleClearHistory = async () => {
    if (!user?.id || isDeleting) return
    if (!window.confirm('Clear all prediction history? This action cannot be undone.')) {
      return
    }
    setIsDeleting(true)
    setError('')
    try {
      const response = await fetch(`/api/predictions/${user.id}`, { method: 'DELETE' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.error) {
        setError(payload?.error || 'Unable to clear history.')
        return
      }
      setHistoryItems([])
    } catch (err) {
      console.error('History delete error', err)
      setError('Unable to clear history.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="page-grid">
      <section className="grid-span">
        <div className="hero hero-tertiary">
          <div className="hero-content">
            <p>Prediction History</p>
            <h2>Every AI assessment at a glance.</h2>
            <span>Monitor trends and revisit previous diagnoses.</span>
          </div>
          <div className="hero-actions">
            <button className="ghost-button" type="button" onClick={() => navigate('/predict')}>
              New prediction
            </button>
            <button className="ghost-button" type="button" onClick={handleClearHistory} disabled={isDeleting}>
              {isDeleting ? 'Clearing...' : 'Clear History'}
            </button>
          </div>
        </div>
      </section>

      <GlassCard title="Prediction Timeline" subtitle="Daily prediction volume" className="grid-span">
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timeline}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5a4" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#0ea5a4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.08)" />
              <XAxis dataKey="label" stroke="rgba(15, 23, 42, 0.6)" />
              <YAxis stroke="rgba(15, 23, 42, 0.6)" />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', color: '#0f172a' }} />
              <Area type="monotone" dataKey="count" stroke="#0ea5a4" fill="url(#areaGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard title="Recent Predictions" subtitle="Detailed historical log" className="grid-span">
        <div className="filter-bar">
          <div className="filter-search">
            <FiSearch />
            <input
              type="text"
              placeholder="Search by disease or symptom"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="filter-group">
            <FiFilter />
            <select value={diseaseFilter} onChange={(event) => setDiseaseFilter(event.target.value)}>
              <option value="all">All diseases</option>
              {uniqueDiseases.map((disease) => (
                <option key={disease} value={disease}>
                  {disease}
                </option>
              ))}
            </select>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setSearchTerm('')
                setDiseaseFilter('all')
                setDateFrom('')
                setDateTo('')
              }}
            >
              Clear filters
            </button>
          </div>
        </div>
        {loading && <div className="symptom-loading">Loading history...</div>}
        {!loading && error && <div className="empty-state"><h4>{error}</h4></div>}
        {!loading && !error && filteredHistory.length ? (
          <div className="history-table">
            <div className="history-row header">
              <span>Date</span>
              <span>Symptoms</span>
              <span>Disease</span>
              <span>Confidence</span>
              <span>Risk</span>
            </div>
            {filteredHistory.map((entry, index) => {
              const parsedDate = entry.date ? new Date(entry.date) : null
              const displayDate = parsedDate && !Number.isNaN(parsedDate.valueOf())
                ? parsedDate.toLocaleDateString()
                : 'Unknown'
              const symptoms = Array.isArray(entry.symptoms) ? entry.symptoms.filter(Boolean) : []
              const symptomText = symptoms.length ? symptoms.map(formatTitleCase).join(', ') : 'Not recorded'
              const risk = getRiskLevel(Number(entry.confidence ?? 0))
              return (
                <div key={`${entry.id ?? 'entry'}-${entry.date}-${index}`} className="history-row">
                  <span>{displayDate}</span>
                  <span>{symptomText}</span>
                  <span>{entry.prediction || 'Unknown'}</span>
                  <span>{Number(entry.confidence ?? 0)}%</span>
                  <span><RiskBadge tone={risk.tone} label={risk.label} /></span>
                </div>
              )
            })}
          </div>
        ) : !loading && !error ? (
          <div className="empty-state">
            <h4>No prediction history found</h4>
            <p>Run a prediction to populate your history and analytics.</p>
          </div>
        ) : null}
      </GlassCard>
    </div>
  )
}

export default HistoryPage
