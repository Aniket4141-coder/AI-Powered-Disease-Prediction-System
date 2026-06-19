import { useEffect, useMemo, useState } from 'react'
import { FiActivity, FiAlertCircle, FiDatabase, FiShield, FiTrash2, FiUsers } from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import GlassCard from '../components/GlassCard'
import StatCard from '../components/StatCard'
import { useAuth } from '../context/AuthContext'

const AdminPage = () => {
  const { user } = useAuth()
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    setError('')

    const overviewRequest = fetch(`/api/admin/overview?user_id=${user.id}`)
      .then((res) => res.json())
    const usersRequest = fetch(`/api/admin/users?user_id=${user.id}`)
      .then((res) => res.json())
    const predictionsRequest = fetch(`/api/admin/predictions?user_id=${user.id}`)
      .then((res) => res.json())

    Promise.all([overviewRequest, usersRequest, predictionsRequest])
      .then(([overviewPayload, usersPayload, predictionsPayload]) => {
        if (overviewPayload?.error) {
          setError(overviewPayload.error)
          return
        }
        if (usersPayload?.error) {
          setError(usersPayload.error)
          return
        }
        if (predictionsPayload?.error) {
          setError(predictionsPayload.error)
          return
        }
        setOverview(overviewPayload)
        setUsers(Array.isArray(usersPayload?.users) ? usersPayload.users : [])
        setPredictions(Array.isArray(predictionsPayload?.predictions) ? predictionsPayload.predictions : [])
      })
      .catch((err) => {
        console.error('Admin API error', err)
        setError('Unable to load admin data.')
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  const stats = useMemo(() => ([
    { label: 'Total Users', value: overview?.total_users ?? 'N/A', trend: 'Platform', icon: FiUsers },
    { label: 'Total Predictions', value: overview?.total_predictions ?? 'N/A', trend: 'All time', icon: FiActivity },
    { label: 'Active Sessions', value: overview?.active_sessions ?? 'N/A', trend: 'Today', icon: FiShield }
  ]), [overview])

  const handleDeleteUser = async (userId) => {
    if (!user?.id) return
    if (!window.confirm('Delete this user and all related predictions? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}?user_id=${user.id}`, {
        method: 'DELETE'
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.error) {
        toast.error(payload?.error || 'Unable to delete user.')
        return
      }
      setUsers((prev) => prev.filter((item) => item.id !== userId))
      setPredictions((prev) => prev.filter((item) => item.user_id !== userId))
      toast.success('User deleted successfully.')
    } catch (err) {
      console.error('Delete user error', err)
      toast.error('Unable to delete user.')
    }
  }

  return (
    <div className="page-grid">
      <section className="grid-span">
        <div className="hero hero-secondary">
          <div className="hero-content">
            <p>Admin Control Center</p>
            <h2>Operational visibility across the care platform.</h2>
            <span>Monitor users, predictions, and recent activity in real time.</span>
          </div>
          <div className="hero-actions">
            <div className="trust-message">
              <FiAlertCircle />
              Admin access enabled
            </div>
          </div>
        </div>
      </section>

      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}

      <GlassCard title="Recent Activity" subtitle="Latest user actions" className="grid-span">
        {loading && <div className="symptom-loading">Loading admin insights...</div>}
        {!loading && error && (
          <div className="empty-state">
            <h4>{error}</h4>
          </div>
        )}
        {!loading && !error && overview?.recent_activity?.length ? (
          <div className="activity-list">
            {overview.recent_activity.map((item) => (
              <div key={`${item.id}-${item.created_at}`} className="activity-item">
                <FiDatabase />
                <div>
                  <h4>{item.user_name || item.user_email || 'User'}</h4>
                  <p>{item.action}</p>
                </div>
                <span>{item.created_at}</span>
              </div>
            ))}
          </div>
        ) : !loading && !error ? (
          <div className="empty-state">
            <h4>No recent activity</h4>
            <p>User activity will appear as soon as predictions run.</p>
          </div>
        ) : null}
      </GlassCard>

      <GlassCard title="Users" subtitle="Registered accounts" className="grid-span">
        {!loading && !error && users.length ? (
          <div className="admin-table">
            <div className="admin-row header">
              <span>User</span>
              <span>Email</span>
              <span>Predictions</span>
              <span>Actions</span>
            </div>
            {users.map((item) => (
              <div key={item.id} className="admin-row">
                <span>{item.name || `User #${item.id}`}</span>
                <span>{item.email}</span>
                <span>{item.prediction_count ?? 0}</span>
                <span>
                  <button
                    type="button"
                    className="ghost-button danger"
                    onClick={() => handleDeleteUser(item.id)}
                  >
                    <FiTrash2 /> Delete
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : !loading && !error ? (
          <div className="empty-state">
            <h4>No users found</h4>
          </div>
        ) : null}
      </GlassCard>

      <GlassCard title="Predictions" subtitle="Latest prediction activity" className="grid-span">
        {!loading && !error && predictions.length ? (
          <div className="admin-table">
            <div className="admin-row header">
              <span>User</span>
              <span>Disease</span>
              <span>Confidence</span>
              <span>Date</span>
            </div>
            {predictions.map((item) => (
              <div key={item.id} className="admin-row">
                <span>{item.user_name || item.user_email || `User #${item.user_id}`}</span>
                <span>{item.prediction || 'Unknown'}</span>
                <span>{Number(item.confidence ?? 0)}%</span>
                <span>{item.created_at}</span>
              </div>
            ))}
          </div>
        ) : !loading && !error ? (
          <div className="empty-state">
            <h4>No predictions found</h4>
          </div>
        ) : null}
      </GlassCard>
    </div>
  )
}

export default AdminPage

