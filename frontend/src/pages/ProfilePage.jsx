import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiActivity,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiHeart,
  FiImage,
  FiLogOut,
  FiMail,
  FiSave,
  FiSettings,
  FiShield,
  FiTrash2,
  FiUpload,
  FiUser
} from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import { useAuth } from '../context/AuthContext'

const DEFAULT_FORM = {
  name: '',
  email: '',
  age: '',
  gender: 'Prefer not to say',
  conditions: '',
  lifestyle: ''
}

const GENDER_OPTIONS = ['Prefer not to say', 'Female', 'Male', 'Non-binary', 'Other']

const normalizeProfilePic = (value) => {
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return value
  return value.startsWith('/') ? value : `/${value}`
}

const formatDateTime = (value) => {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return 'Not available'
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDate = (value) => {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return 'Not available'
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatConfidence = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0%'
  return `${Math.round(number)}%`
}

const ProfilePage = () => {
  const { user, updateUser, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState(DEFAULT_FORM)
  const [savedProfilePic, setSavedProfilePic] = useState('')
  const [profilePreview, setProfilePreview] = useState('')
  const [profileRemoved, setProfileRemoved] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState({ type: '', message: '' })
  const [deleting, setDeleting] = useState(false)

  const displayName = form.name || user?.name || user?.full_name || 'Guest User'
  const displayEmail = form.email || user?.email || 'No email listed'
  const joinedDate = user?.created_at || user?.joined_at || ''

  const initials = useMemo(() => {
    const source = displayName || displayEmail || 'U'
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U'
  }, [displayEmail, displayName])

  const avatarSource = !profileRemoved ? (profilePreview || savedProfilePic) : ''

  const sortedPredictions = useMemo(() => {
    if (!Array.isArray(predictions)) return []
    return [...predictions].sort((a, b) => new Date(b?.created_at || b?.date || 0) - new Date(a?.created_at || a?.date || 0))
  }, [predictions])

  const totalPredictions = sortedPredictions.length
  const highRiskCases = sortedPredictions.filter((entry) => String(entry?.risk_level || '').toLowerCase() === 'high').length
  const lastPrediction = sortedPredictions[0] || null
  const recentPredictions = sortedPredictions.slice(0, 5)

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const [profileResponse, predictionResponse] = await Promise.all([
          fetch('/api/profile', { credentials: 'include' }),
          fetch(`/api/predictions/${user.id}`, { credentials: 'include' })
        ])

        const profilePayload = await profileResponse.json().catch(() => ({}))
        const predictionPayload = await predictionResponse.json().catch(() => ({}))

        const apiUser = profilePayload?.user || {}
        const resolvedAvatar = normalizeProfilePic(apiUser.profile_pic || user?.profile_pic || '')

        setSavedProfilePic(resolvedAvatar)
        setProfilePreview(resolvedAvatar)
        setProfileRemoved(false)
        setSelectedFile(null)

        setForm({
          name: apiUser.full_name || user?.name || user?.full_name || '',
          email: apiUser.email || user?.email || '',
          age: Number.isFinite(Number(user?.age)) ? String(user.age) : '',
          gender: GENDER_OPTIONS.includes(user?.gender) ? user.gender : 'Prefer not to say',
          conditions: user?.conditions || '',
          lifestyle: user?.lifestyle || ''
        })

        setPredictions(Array.isArray(predictionPayload?.predictions) ? predictionPayload.predictions : [])
      } catch (error) {
        setPredictions([])
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user])

  useEffect(() => {
    if (!notice.message) return undefined
    const timer = window.setTimeout(() => setNotice({ type: '', message: '' }), 4500)
    return () => window.clearTimeout(timer)
  }, [notice])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setProfileRemoved(false)
    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setProfilePreview(result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    if (!avatarSource && !selectedFile) return
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return

    setProfileRemoved(true)
    setProfilePreview('')
    setSavedProfilePic('')
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    updateUser({ profile_pic: '' })
    setNotice({ type: 'success', message: 'Profile picture removed.' })
  }

  const syncProfilePicture = async () => {
    if (!selectedFile || profileRemoved) return ''

    const picForm = new FormData()
    picForm.append('profile_pic', selectedFile)
    await fetch('/upload_profile_pic', {
      method: 'POST',
      body: picForm,
      credentials: 'include'
    })

    const refreshed = await fetch('/api/profile', { credentials: 'include' })
    const refreshedPayload = await refreshed.json().catch(() => ({}))
    const refreshedPic = normalizeProfilePic(refreshedPayload?.user?.profile_pic || '')
    setSavedProfilePic(refreshedPic)
    setProfilePreview(refreshedPic)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    return refreshedPic
  }

  const handleSave = async () => {
    if (saving) return

    const trimmedName = form.name.trim()
    if (!trimmedName) {
      toast.error('Full name is required.')
      return
    }

    const ageValue = form.age ? Number(form.age) : ''
    if (form.age && (!Number.isFinite(ageValue) || ageValue <= 0)) {
      toast.error('Enter a valid age.')
      return
    }

    setSaving(true)
    try {
      const nameForm = new FormData()
      nameForm.append('full_name', trimmedName)
      await fetch('/update_profile', {
        method: 'POST',
        body: nameForm,
        credentials: 'include'
      })

      const nextProfilePic = await syncProfilePicture()
      const nextAvatar = profileRemoved ? '' : nextProfilePic || profilePreview || savedProfilePic

      updateUser({
        name: trimmedName,
        full_name: trimmedName,
        email: form.email,
        age: ageValue || undefined,
        gender: form.gender,
        conditions: form.conditions,
        lifestyle: form.lifestyle,
        profile_pic: nextAvatar
      })

      setNotice({ type: 'success', message: 'Profile updated successfully.' })
      toast.success('Profile updated successfully.')
    } catch (error) {
      updateUser({
        name: trimmedName,
        full_name: trimmedName,
        email: form.email,
        age: ageValue || undefined,
        gender: form.gender,
        conditions: form.conditions,
        lifestyle: form.lifestyle,
        profile_pic: profileRemoved ? '' : profilePreview || savedProfilePic
      })
      setNotice({ type: 'success', message: 'Profile updated locally.' })
      toast.success('Profile updated locally.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleGoToSettings = () => {
    navigate('/settings')
  }

  const handleDeleteAccount = async () => {
    if (deleting) return
    if (!window.confirm('Delete your account? This will clear your local session on this device.')) return

    setDeleting(true)
    try {
      if (isAdmin && user?.id) {
        await fetch(`/api/admin/users/${user.id}?user_id=${user.id}`, {
          method: 'DELETE',
          credentials: 'include'
        })
      }
    } catch {
      // Best effort only; local logout still proceeds.
    } finally {
      logout()
      navigate('/login')
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="symptom-loading">Loading profile...</div>
  }

  return (
    <div className="page-grid profile-page">
      <section className="grid-span">
        <div className="hero hero-tertiary profile-hero">
          <div className="hero-content">
            <p>Account Profile</p>
            <h2>Your personal health dashboard.</h2>
            <span>Review your details, activity, and account controls in one place.</span>
          </div>
        </div>
      </section>

      {notice.message && (
        <section className="grid-span">
          <div className={`profile-notice ${notice.type === 'error' ? 'error' : 'success'}`}>
            <FiCheckCircle />
            <span>{notice.message}</span>
          </div>
        </section>
      )}

      <section className="grid-span">
        <div className="profile-headerCard">
          <div className="profile-accentBar" />
          <div className="profile-headerMain">
            <div className="profile-avatarBlock">
              <div className="profile-avatarShell">
                {avatarSource ? <img src={avatarSource} alt="Profile" /> : <span>{initials}</span>}
              </div>
              <div className="profile-avatarActions">
                <input
                  ref={fileInputRef}
                  id="profile-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                />
                <label htmlFor="profile-photo-upload" className="profile-uploadButton">
                  <FiUpload />
                  Upload photo
                </label>
                <button type="button" className="profile-removeButton" onClick={handleRemovePhoto}>
                  <FiTrash2 />
                  Remove Photo
                </button>
              </div>
            </div>

            <div className="profile-headerInfo">
              <div className="profile-kicker">Profile</div>
              <div className="profile-titleRow">
                <h3>{displayName}</h3>
                <span className={`profile-roleBadge ${isAdmin ? 'admin' : ''}`}>
                  <FiShield />
                  {isAdmin ? 'Admin' : 'User'}
                </span>
              </div>
              <div className="profile-metaGrid">
                <div>
                  <FiMail />
                  <span>{displayEmail}</span>
                </div>
                <div>
                  <FiCalendar />
                  <span>{joinedDate ? formatDateTime(joinedDate) : 'Joined date not available'}</span>
                </div>
                <div>
                  <FiHeart />
                  <span>{form.gender || 'Prefer not to say'}</span>
                </div>
              </div>
            </div>

            <div className="profile-headerActions">
              <button type="button" className="profile-actionButton secondary" onClick={handleGoToSettings}>
                <FiSettings />
                Go to Settings
              </button>
              <button type="button" className="profile-actionButton" onClick={handleLogout}>
                <FiLogOut />
                Logout
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid-span">
        <div className="profile-statsGrid">
          <div className="profile-statCard">
            <div className="profile-statIcon blue"><FiActivity /></div>
            <div className="profile-statCopy">
              <span>Total Predictions</span>
              <strong>{totalPredictions}</strong>
            </div>
          </div>
          <div className="profile-statCard">
            <div className="profile-statIcon amber"><FiShield /></div>
            <div className="profile-statCopy">
              <span>High Risk Cases</span>
              <strong>{highRiskCases}</strong>
            </div>
          </div>
          <div className="profile-statCard">
            <div className="profile-statIcon teal"><FiClock /></div>
            <div className="profile-statCopy">
              <span>Last Prediction Date</span>
              <strong>{lastPrediction ? formatDateTime(lastPrediction.created_at || lastPrediction.date) : 'No activity yet'}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="grid-span profile-contentGrid">
        <GlassCard title="Edit Profile" subtitle="Update your personal details" className="profile-sectionCard">
          <div className="profile-formGrid">
            <label className="profile-field">
              <span>Full Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Enter your full name"
              />
            </label>
            <label className="profile-field">
              <span>Age</span>
              <input
                type="number"
                min="1"
                value={form.age}
                onChange={(event) => updateField('age', event.target.value)}
                placeholder="Age"
              />
            </label>
            <label className="profile-field profile-fieldFull">
              <span>Gender</span>
              <select value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="profile-formActions">
            <button className="profile-saveButton" type="button" onClick={handleSave} disabled={saving}>
              <FiSave />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </GlassCard>

        <GlassCard title="Health Profile" subtitle="Context that helps tailor guidance" className="profile-sectionCard">
          <div className="profile-formGrid">
            <label className="profile-field profile-fieldFull">
              <span>Existing Conditions</span>
              <textarea
                rows="4"
                value={form.conditions}
                onChange={(event) => updateField('conditions', event.target.value)}
                placeholder="List conditions, medications, allergies, or notes"
              />
            </label>
            <label className="profile-field profile-fieldFull">
              <span>Lifestyle</span>
              <textarea
                rows="3"
                value={form.lifestyle}
                onChange={(event) => updateField('lifestyle', event.target.value)}
                placeholder="Optional: sleep, exercise, diet, and stress notes"
              />
            </label>
          </div>
        </GlassCard>
      </section>

      <section className="grid-span profile-contentGrid profile-contentGridBottom">
        <GlassCard title="Recent Activity" subtitle="Last 5 predictions" className="profile-sectionCard">
          {recentPredictions.length ? (
            <div className="profile-activityList">
              {recentPredictions.map((entry, index) => (
                <div key={`${entry.id || 'prediction'}-${index}`} className="profile-activityItem">
                  <div className="profile-activityIcon"><FiActivity /></div>
                  <div className="profile-activityMain">
                    <strong>{entry.prediction || 'Unknown condition'}</strong>
                    <span>{entry.symptoms || 'Symptoms not available'}</span>
                  </div>
                  <div className="profile-activityMeta">
                    <span>{formatConfidence(entry.confidence)}</span>
                    <small>{formatDateTime(entry.created_at || entry.date)}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="profile-emptyState">
              <h4>No activity yet</h4>
              <p>Run a prediction to see your latest results here.</p>
            </div>
          )}
        </GlassCard>

        <GlassCard title="Account Actions" subtitle="Manage your session and account" className="profile-sectionCard">
          <div className="profile-actionStack">
            <button type="button" className="profile-actionButton secondary" onClick={handleGoToSettings}>
              <FiSettings />
              Go to Settings
            </button>
            <button type="button" className="profile-actionButton" onClick={handleLogout}>
              <FiLogOut />
              Logout
            </button>
            <button type="button" className="profile-actionButton danger" onClick={handleDeleteAccount} disabled={deleting}>
              <FiTrash2 />
              {deleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </GlassCard>
      </section>
    </div>
  )
}

export default ProfilePage
