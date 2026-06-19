import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiCalendar,
  FiClock,
  FiShield,
  FiTrendingUp,
  FiZap
} from 'react-icons/fi'
import {
  Bar,
  Line,
  ResponsiveContainer,
  BarChart,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import GlassCard from '../components/GlassCard'
import StatCard from '../components/StatCard'
import { useAuth } from '../context/AuthContext'

const DashboardPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [predictions, setPredictions] = useState([])

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const endpoint = user?.id ? `/api/predictions/${user.id}` : '/api/history'
      const response = await fetch(endpoint)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.error) {
        throw new Error(payload?.error || 'Unable to load dashboard data.')
      }
      const items = payload?.predictions || payload?.history || []
      setPredictions(Array.isArray(items) ? items : [])
    } catch (err) {
      setError('Unable to load dashboard data. Please try again.')
      setPredictions([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const history = useMemo(() => {
    if (!Array.isArray(predictions)) return []
    return [...predictions].sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0))
  }, [predictions])

  const distributionData = useMemo(() => {
    const distributionMap = {}
    history.forEach((item) => {
      const disease = item?.prediction
      if (!disease) return
      distributionMap[disease] = (distributionMap[disease] || 0) + 1
    })
    return Object.keys(distributionMap).map((key) => ({
      name: key,
      value: distributionMap[key]
    }))
  }, [history])

  const trendData = useMemo(() => {
    const velocityMap = {}
    history.forEach((item) => {
      if (!item?.date) return
      const dateObj = new Date(item.date)
      if (Number.isNaN(dateObj.valueOf())) return
      const dateKey = dateObj.toISOString().slice(0, 10)
      const label = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      velocityMap[dateKey] = {
        label,
        count: (velocityMap[dateKey]?.count || 0) + 1,
        dateKey
      }
    })
    return Object.values(velocityMap)
      .sort((a, b) => (a.dateKey > b.dateKey ? 1 : -1))
      .slice(-14)
      .map(({ label, count, dateKey }) => ({
        date: label,
        count,
        dateKey
      }))
  }, [history])

  const riskData = useMemo(() => {
    const riskMap = { High: 0, Medium: 0, Low: 0 }
    history.forEach((item) => {
      const level = (item?.risk_level || 'Low').toString().toLowerCase()
      if (level === 'high') riskMap.High += 1
      else if (level === 'medium') riskMap.Medium += 1
      else riskMap.Low += 1
    })
    return [
      { level: 'High', count: riskMap.High, fill: '#ef4444' },
      { level: 'Medium', count: riskMap.Medium, fill: '#f59e0b' },
      { level: 'Low', count: riskMap.Low, fill: '#22c55e' }
    ]
  }, [history])

  const lastEntry = history[0]
  const lastDate = lastEntry?.date ? new Date(lastEntry.date) : null
  const lastDateLabel = lastDate && !Number.isNaN(lastDate.valueOf())
    ? lastDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A'

  const todayKey = new Date().toISOString().slice(0, 10)
  const todayCount = history.filter((item) => item?.date && item.date.slice(0, 10) === todayKey).length
  const highRiskCount = history.filter((item) => (item?.risk_level || '').toLowerCase() === 'high').length
  const mostCommonDisease = distributionData[0]?.name || 'N/A'

  const stats = [
    { label: 'Total Predictions', value: history.length, trend: 'All time', icon: FiActivity },
    { label: 'High Risk Cases', value: highRiskCount, trend: 'Critical alerts', icon: FiAlertTriangle },
    { label: "Today's Predictions", value: todayCount, trend: 'Last 24 hours', icon: FiCalendar },
    { label: 'Most Common Disease', value: mostCommonDisease, trend: 'Top condition', icon: FiTrendingUp }
  ]

  const insights = [
    {
      title: 'High-risk monitoring',
      body: `You have ${highRiskCount} high-risk prediction${highRiskCount === 1 ? '' : 's'} in the recent log.`
    },
    {
      title: 'Most frequent disease',
      body: mostCommonDisease === 'N/A'
        ? 'No dominant disease pattern has emerged yet.'
        : `Most frequent disease: ${mostCommonDisease}.`
    },
    {
      title: 'Recent activity',
      body: history.length
        ? `Last prediction on ${lastDateLabel}.`
        : 'Start a prediction to begin tracking your health signals.'
    }
  ]

  const hasHistory = history.length > 0
  const displayName = user?.name || user?.full_name || 'Care Member'
  const chartColors = ['#0ea5a4', '#2563eb', '#22c55e', '#f97316', '#ec4899', '#a855f7']
  const recentPredictions = history.slice(0, 5)

  const SummaryCards = () => (
    <>
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </>
  )

  const ChartsSection = () => (
    <>
      <GlassCard title="Prediction Trends" subtitle="Daily prediction volume" className="grid-span">
        {!hasHistory && <div className="empty-state">No predictions yet</div>}
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.08)" />
              <XAxis dataKey="date" stroke="rgba(15, 23, 42, 0.6)" />
              <YAxis allowDecimals={false} stroke="rgba(15, 23, 42, 0.6)" />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', color: '#0f172a' }} />
              <Line type="monotone" dataKey="count" stroke="#0ea5a4" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard title="Disease Distribution" subtitle="Share of detected conditions" className="grid-span">
        {!hasHistory && <div className="empty-state">No predictions yet</div>}
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', color: '#0f172a' }} />
              <Legend verticalAlign="bottom" height={32} />
              <Pie data={distributionData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100}>
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${entry.name}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard title="Risk Level Mix" subtitle="High, medium, and low risk breakdown" className="grid-span">
        {!hasHistory && <div className="empty-state">No predictions yet</div>}
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={riskData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.08)" />
              <XAxis dataKey="level" stroke="rgba(15, 23, 42, 0.6)" />
              <YAxis allowDecimals={false} stroke="rgba(15, 23, 42, 0.6)" />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', color: '#0f172a' }} />
              <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                {riskData.map((entry) => (
                  <Cell key={entry.level} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </>
  )

  const RecentActivity = () => (
    <GlassCard title="Recent Predictions" subtitle="Latest assessments" className="grid-span">
      {!hasHistory ? (
        <div className="empty-state">
          <h4>No predictions yet</h4>
          <p>Start your first assessment to populate insights here.</p>
          <button className="primary-button" type="button" onClick={() => navigate('/predict')}>
            Start Prediction
          </button>
        </div>
      ) : (
        <div className="recent-list">
          {recentPredictions.map((entry) => {
            const date = entry.date ? new Date(entry.date) : null
            const dateLabel = date && !Number.isNaN(date.valueOf())
              ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Unknown'
            return (
              <div key={entry.id} className="recent-item">
                <div>
                  <h4>{entry.prediction || 'Unknown'}</h4>
                  <p>{Number(entry.confidence ?? 0).toFixed(1)}% confidence</p>
                </div>
                <div className="recent-meta">
                  <FiClock />
                  <span>{dateLabel}</span>
                </div>
                <div className="recent-confidence">
                  <FiZap />
                  <span>{Number(entry.confidence ?? 0).toFixed(0)}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </GlassCard>
  )

  const Insights = () => (
    <GlassCard title="Smart Insights" subtitle="Signals derived from your predictions" className="grid-span">
      <div className="insight-grid">
        {insights.map((item) => (
          <div key={item.title} className="insight-card">
            <div className="insight-icon">
              <FiShield />
            </div>
            <div>
              <h4>{item.title}</h4>
              <p>{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )

  const QuickActions = () => (
    <GlassCard title="Quick Actions" subtitle="Fast access to key workflows" className="grid-span">
      <div className="quick-actions">
        <button className="primary-button" type="button" onClick={() => navigate('/predict')}>
          <FiZap /> Start New Prediction
        </button>
        <button className="ghost-button" type="button" onClick={() => navigate('/history')}>
          <FiBarChart2 /> View History
        </button>
      </div>
    </GlassCard>
  )

  return (
    <div className="page-grid">
      <section className="grid-span">
        <div className="hero hero-primary">
          <div className="hero-content">
            <p>Clinical Intelligence Dashboard</p>
            <h2>Welcome back, {displayName}. Here is your latest prediction intelligence.</h2>
            <span>Track insights, monitor risk, and review your prediction patterns.</span>
            <div className="hero-metrics">
              <div>
                <h4>Total predictions</h4>
                <strong>{history.length}</strong>
              </div>
              <div>
                <h4>High risk cases</h4>
                <strong>{highRiskCount}</strong>
              </div>
              <div>
                <h4>Most common disease</h4>
                <strong>{mostCommonDisease}</strong>
              </div>
            </div>
          </div>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => navigate('/predict')}>
              Start new prediction
            </button>
            <button className="ghost-button" type="button" onClick={() => navigate('/history')}>
              View history
            </button>
          </div>
        </div>
      </section>

      <SummaryCards />

      {error && (
        <GlassCard title="Dashboard Status" subtitle="We could not load your latest analytics." className="grid-span">
          <p>{error}</p>
          <button className="ghost-button" type="button" onClick={fetchDashboardData}>
            Retry
          </button>
        </GlassCard>
      )}

      <ChartsSection />
      <Insights />
      <RecentActivity />
      <QuickActions />

      {loading && <div className="symptom-loading">Refreshing dashboard data...</div>}
    </div>
  )
}

export default DashboardPage
