import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiAlertTriangle,
  FiBell,
  FiBellOff,
  FiCheckCircle,
  FiCpu,
  FiDatabase,
  FiDownload,
  FiGlobe,
  FiHeart,
  FiImage,
  FiLock,
  FiMoon,
  FiRefreshCw,
  FiSave,
  FiSettings,
  FiShield,
  FiSun,
  FiTrash2,
  FiUpload,
  FiUser
} from 'react-icons/fi'
import GlassCard from '../components/GlassCard'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'settings-control-panel-v1'
const LEGACY_STORAGE_KEY = 'settings'

const DEFAULT_SETTINGS = {
  account: {
    fullName: '',
    email: '',
    avatarDataUrl: '',
    avatarFileName: ''
  },
  preferences: {
    theme: 'light',
    notifications: true,
    language: 'English',
    density: 'Comfortable'
  },
  ai: {
    responseStyle: 'Simple',
    tone: 'Friendly',
    suggestions: true
  },
  health: {
    age: '',
    gender: 'Prefer not to say',
    conditions: ''
  }
}

const SECURITY_DEFAULTS = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
}

const GENDER_OPTIONS = ['Prefer not to say', 'Female', 'Male', 'Non-binary', 'Other']
const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Spanish', 'French', 'Arabic']
const DENSITY_OPTIONS = ['Comfortable', 'Compact']
const RESPONSE_OPTIONS = ['Simple', 'Detailed']
const TONE_OPTIONS = ['Friendly', 'Professional']

const safeParse = (raw) => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
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

const mergeSettings = (stored, user) => {
  const next = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
  const source = stored && typeof stored === 'object' ? stored : {}

  next.account.fullName = source?.account?.fullName || user?.name || user?.full_name || ''
  next.account.email = source?.account?.email || user?.email || ''
  next.account.avatarDataUrl = source?.account?.avatarDataUrl || ''
  next.account.avatarFileName = source?.account?.avatarFileName || ''

  next.preferences.theme = source?.preferences?.theme === 'dark' ? 'dark' : 'light'
  next.preferences.notifications = typeof source?.preferences?.notifications === 'boolean'
    ? source.preferences.notifications
    : true
  next.preferences.language = LANGUAGE_OPTIONS.includes(source?.preferences?.language)
    ? source.preferences.language
    : 'English'
  next.preferences.density = DENSITY_OPTIONS.includes(source?.preferences?.density)
    ? source.preferences.density
    : 'Comfortable'

  next.ai.responseStyle = RESPONSE_OPTIONS.includes(source?.ai?.responseStyle)
    ? source.ai.responseStyle
    : 'Simple'
  next.ai.tone = TONE_OPTIONS.includes(source?.ai?.tone)
    ? source.ai.tone
    : 'Friendly'
  next.ai.suggestions = typeof source?.ai?.suggestions === 'boolean' ? source.ai.suggestions : true

  next.health.age = source?.health?.age ?? (Number.isFinite(Number(user?.age)) ? String(user.age) : '')
  next.health.gender = GENDER_OPTIONS.includes(source?.health?.gender)
    ? source.health.gender
    : 'Prefer not to say'
  next.health.conditions = source?.health?.conditions || ''

  return next
}

const SettingsPage = () => {
  const { user, isAdmin, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [securityForm, setSecurityForm] = useState(SECURITY_DEFAULTS)
  const [accountSaving, setAccountSaving] = useState(false)
  const [securitySaving, setSecuritySaving] = useState(false)
  const [historyClearing, setHistoryClearing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [notice, setNotice] = useState({ type: '', message: '' })
  const [hydrated, setHydrated] = useState(false)

  const displayName = settings.account.fullName || user?.name || user?.full_name || 'Guest User'
  const displayEmail = settings.account.email || user?.email || 'No email listed'
  const initials = useMemo(() => {
    const source = displayName || displayEmail
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U'
  }, [displayEmail, displayName])

  const lastLogin = user?.last_login || user?.lastLogin || user?.updated_at || ''

  useEffect(() => {
    const localStored = safeParse(window.localStorage.getItem(STORAGE_KEY))
    const legacyStored = safeParse(window.sessionStorage.getItem(LEGACY_STORAGE_KEY))
    const mergedStored = {
      ...localStored,
      ...legacyStored,
      account: {
        ...(localStored?.account || {}),
        ...(legacyStored?.account || {})
      },
      preferences: {
        ...(localStored?.preferences || {}),
        ...(legacyStored?.preferences || {})
      },
      ai: {
        ...(localStored?.ai || {}),
        ...(legacyStored?.ai || {})
      },
      health: {
        ...(localStored?.health || {}),
        ...(legacyStored?.health || {})
      }
    }
    setSettings(mergeSettings(mergedStored, user))
    setHydrated(true)
  }, [user])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [hydrated, settings])

  useEffect(() => {
    if (!hydrated) return
    document.documentElement.setAttribute('data-theme', settings.preferences.theme)
    window.sessionStorage.setItem('theme-preference', settings.preferences.theme)
  }, [hydrated, settings.preferences.theme])

  useEffect(() => {
    if (!user) return
    setSettings((prev) => {
      const next = { ...prev }
      if (!next.account.fullName) next.account.fullName = user?.name || user?.full_name || ''
      if (!next.account.email) next.account.email = user?.email || ''
      if (!next.health.age && Number.isFinite(Number(user?.age))) next.health.age = String(user.age)
      return next
    })
  }, [user])

  useEffect(() => {
    if (!notice.message) return undefined
    const timer = window.setTimeout(() => setNotice({ type: '', message: '' }), 4500)
    return () => window.clearTimeout(timer)
  }, [notice])

  const updateAccountField = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      account: {
        ...prev.account,
        [field]: value
      }
    }))
  }

  const updatePreferenceField = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [field]: value
      }
    }))
  }

  const updateAiField = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      ai: {
        ...prev.ai,
        [field]: value
      }
    }))
  }

  const updateHealthField = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      health: {
        ...prev.health,
        [field]: value
      }
    }))
  }

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setSettings((prev) => ({
        ...prev,
        account: {
          ...prev.account,
          avatarDataUrl: result,
          avatarFileName: file.name
        }
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    if (!settings.account.avatarDataUrl && !settings.account.avatarFileName) return
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    setSettings((prev) => ({
      ...prev,
      account: {
        ...prev.account,
        avatarDataUrl: '',
        avatarFileName: ''
      }
    }))
  }

  const syncAccountToBackend = async (fullName) => {
    const requests = []

    if (fullName) {
      const profileForm = new FormData()
      profileForm.append('full_name', fullName)
      requests.push(fetch('/update_profile', { method: 'POST', body: profileForm, credentials: 'include' }))
    }

    if (fileInputRef.current?.files?.[0]) {
      const picForm = new FormData()
      picForm.append('profile_pic', fileInputRef.current.files[0])
      requests.push(fetch('/upload_profile_pic', { method: 'POST', body: picForm, credentials: 'include' }))
    }

    if (!requests.length) return
    await Promise.allSettled(requests)
  }

  const handleAccountSave = async () => {
    const fullName = settings.account.fullName.trim()
    if (!fullName) {
      setNotice({ type: 'error', message: 'Full name is required.' })
      return
    }

    setAccountSaving(true)
    try {
      await syncAccountToBackend(fullName)
      updateUser({
        name: fullName,
        full_name: fullName,
        email: settings.account.email,
        age: settings.health.age ? Number(settings.health.age) : undefined
      })
      setNotice({ type: 'success', message: 'Account settings saved successfully.' })
    } catch {
      updateUser({
        name: fullName,
        full_name: fullName,
        email: settings.account.email,
        age: settings.health.age ? Number(settings.health.age) : undefined
      })
      setNotice({ type: 'success', message: 'Account settings saved locally.' })
    } finally {
      setAccountSaving(false)
    }
  }

  const handleSecuritySave = async () => {
    const { currentPassword, newPassword, confirmPassword } = securityForm
    if (!currentPassword || !newPassword || !confirmPassword) {
      setNotice({ type: 'error', message: 'Complete all password fields before saving.' })
      return
    }
    if (newPassword.length < 8) {
      setNotice({ type: 'error', message: 'New password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setNotice({ type: 'error', message: 'New password and confirmation do not match.' })
      return
    }

    setSecuritySaving(true)
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 500))
      setSecurityForm(SECURITY_DEFAULTS)
      setNotice({ type: 'success', message: 'Security settings saved locally.' })
    } finally {
      setSecuritySaving(false)
    }
  }

  const handleClearHistory = async () => {
    if (!user?.id || historyClearing) return
    if (!window.confirm('Clear all prediction history for this account? This action cannot be undone.')) {
      return
    }

    setHistoryClearing(true)
    try {
      const response = await fetch(`/api/history/${user.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.error) {
        throw new Error(payload?.error || 'Unable to clear history.')
      }
      setNotice({ type: 'success', message: 'Prediction history cleared.' })
    } catch {
      setNotice({ type: 'error', message: 'Unable to clear prediction history right now.' })
    } finally {
      setHistoryClearing(false)
    }
  }

  const handleDownloadData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: {
        fullName: settings.account.fullName,
        email: settings.account.email,
        avatarFileName: settings.account.avatarFileName
      },
      preferences: settings.preferences,
      ai: settings.ai,
      health: settings.health,
      user: {
        id: user?.id,
        role: user?.role,
        isAdmin: isAdmin
      }
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `health-settings-${(displayName || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice({ type: 'success', message: 'Your data export has started.' })
  }

  const handleDeleteAccount = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      if (isAdmin && user?.id) {
        await fetch(`/api/admin/users/${user.id}?user_id=${user.id}`, {
          method: 'DELETE',
          credentials: 'include'
        }).catch(() => {})
      }
      window.localStorage.removeItem(STORAGE_KEY)
      window.sessionStorage.removeItem(LEGACY_STORAGE_KEY)
      logout()
      navigate('/login')
    } finally {
      setShowDeleteDialog(false)
      setDeleting(false)
    }
  }

  return (
    <div className="page-grid settings-page">
      <section className="grid-span">
        <div className="hero hero-tertiary settings-hero">
          <div className="hero-content">
            <p>Settings</p>
            <h2>Fine-tune how the platform works for you.</h2>
            <span>Advanced account, privacy, and AI preferences are stored locally on this device.</span>
          </div>
        </div>
      </section>

      {notice.message && (
        <section className="grid-span settings-notice-wrap">
          <div className={`settings-notice ${notice.type === 'error' ? 'error' : 'success'}`}>
            <FiShield />
            <span>{notice.message}</span>
          </div>
        </section>
      )}

      <GlassCard className="grid-span settings-shell-card">
        <div className="settings-grid">
          <GlassCard className="settings-card settings-span-6">
            <div className="settings-section-header">
              <div className="settings-section-icon"><FiUser /></div>
              <div>
                <span className="settings-section-kicker">Account</span>
                <h3>Account settings</h3>
                <p>Update your profile information and profile picture.</p>
              </div>
            </div>

            <div className="settings-profile">
              <div className="settings-avatarBlock">
                <div className="settings-avatar">
                  {settings.account.avatarDataUrl ? (
                    <img src={settings.account.avatarDataUrl} alt="Profile preview" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="settings-avatarMeta">
                  <strong>{displayName}</strong>
                  <span>{displayEmail}</span>
                  {settings.account.avatarFileName && <small>{settings.account.avatarFileName}</small>}
                  {(settings.account.avatarDataUrl || settings.account.avatarFileName) && (
                    <button type="button" className="settings-removeButton" onClick={handleRemoveAvatar}>
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>

              <div className="settings-formGrid">
                <label className="settings-field">
                  <span>Full Name</span>
                  <input
                    type="text"
                    value={settings.account.fullName}
                    onChange={(event) => updateAccountField('fullName', event.target.value)}
                    placeholder="Enter your full name"
                  />
                </label>

                <label className="settings-field">
                  <span>Email</span>
                  <input type="email" value={settings.account.email} readOnly />
                </label>
              </div>

              <div className="settings-uploadRow">
                <input
                  ref={fileInputRef}
                  id="profile-picture-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                />
                <label htmlFor="profile-picture-upload" className="settings-uploadButton">
                  <FiImage />
                  Upload picture
                </label>
                <button type="button" className="settings-secondaryButton" onClick={() => fileInputRef.current?.click()}>
                  <FiUpload />
                  Choose file
                </button>
              </div>

              <div className="settings-actionsRow">
                <button type="button" className="settings-primaryButton" onClick={handleAccountSave} disabled={accountSaving}>
                  <FiSave />
                  {accountSaving ? 'Saving...' : 'Save account'}
                </button>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="settings-card settings-span-6">
            <div className="settings-section-header">
              <div className="settings-section-icon"><FiLock /></div>
              <div>
                <span className="settings-section-kicker">Security</span>
                <h3>Security settings</h3>
                <p>Change your password and review the latest sign-in information.</p>
              </div>
            </div>

            <div className="settings-formGrid">
              <label className="settings-field">
                <span>Current Password</span>
                <input
                  type="password"
                  value={securityForm.currentPassword}
                  onChange={(event) => setSecurityForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  placeholder="Current password"
                />
              </label>
              <label className="settings-field">
                <span>New Password</span>
                <input
                  type="password"
                  value={securityForm.newPassword}
                  onChange={(event) => setSecurityForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  placeholder="New password"
                />
              </label>
              <label className="settings-field settings-field-full">
                <span>Confirm Password</span>
                <input
                  type="password"
                  value={securityForm.confirmPassword}
                  onChange={(event) => setSecurityForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  placeholder="Confirm new password"
                />
              </label>
            </div>

            <div className="settings-infoRow">
              <div>
                <small>Last login</small>
                <strong>{formatDateTime(lastLogin)}</strong>
              </div>
              <button type="button" className="settings-primaryButton settings-ghost" onClick={handleSecuritySave} disabled={securitySaving}>
                <FiShield />
                {securitySaving ? 'Updating...' : 'Save security'}
              </button>
            </div>
          </GlassCard>

          <GlassCard className="settings-card settings-span-6">
            <div className="settings-section-header">
              <div className="settings-section-icon"><FiGlobe /></div>
              <div>
                <span className="settings-section-kicker">Preferences</span>
                <h3>Preferences</h3>
                <p>Shape the interface and daily experience to your liking.</p>
              </div>
            </div>

            <div className="settings-toggleList">
              <div className="settings-toggleRow">
                <div>
                  <strong>Theme</strong>
                  <span>Light and dark mode</span>
                </div>
                <button
                  className="settings-switch"
                  type="button"
                  onClick={() => updatePreferenceField('theme', settings.preferences.theme === 'dark' ? 'light' : 'dark')}
                  data-theme={settings.preferences.theme}
                  aria-label={`Switch to ${settings.preferences.theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  <span className="theme-icon">{settings.preferences.theme === 'dark' ? <FiMoon /> : <FiSun />}</span>
                  <span className="theme-switch" aria-hidden="true">
                    <span className="theme-thumb" />
                  </span>
                </button>
              </div>

              <div className="settings-toggleRow">
                <div>
                  <strong>Notifications</strong>
                  <span>Health reminders and alerts</span>
                </div>
                <button
                  className="settings-switch"
                  type="button"
                  onClick={() => updatePreferenceField('notifications', !settings.preferences.notifications)}
                  data-theme={settings.preferences.notifications ? 'dark' : 'light'}
                  aria-label={settings.preferences.notifications ? 'Disable notifications' : 'Enable notifications'}
                >
                  <span className="theme-icon">{settings.preferences.notifications ? <FiBell /> : <FiBellOff />}</span>
                  <span className="theme-switch" aria-hidden="true">
                    <span className="theme-thumb" />
                  </span>
                </button>
              </div>
            </div>

            <div className="settings-formGrid">
              <label className="settings-field">
                <span>Language</span>
                <select
                  value={settings.preferences.language}
                  onChange={(event) => updatePreferenceField('language', event.target.value)}
                >
                  {LANGUAGE_OPTIONS.map((language) => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
              </label>
              <label className="settings-field">
                <span>UI density</span>
                <select
                  value={settings.preferences.density}
                  onChange={(event) => updatePreferenceField('density', event.target.value)}
                >
                  {DENSITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
          </GlassCard>

          <GlassCard className="settings-card settings-span-6">
            <div className="settings-section-header">
              <div className="settings-section-icon"><FiCpu /></div>
              <div>
                <span className="settings-section-kicker">AI Settings</span>
                <h3>AI settings</h3>
                <p>Control the assistant?s response style and tone.</p>
              </div>
            </div>

            <div className="settings-choiceGroup">
              <span className="settings-groupLabel">Response style</span>
              <div className="settings-segmentedControl">
                {RESPONSE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`settings-segment ${settings.ai.responseStyle === option ? 'active' : ''}`}
                    onClick={() => updateAiField('responseStyle', option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-choiceGroup">
              <span className="settings-groupLabel">Tone</span>
              <div className="settings-segmentedControl">
                {TONE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`settings-segment ${settings.ai.tone === option ? 'active' : ''}`}
                    onClick={() => updateAiField('tone', option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-toggleRow settings-toggleCard">
              <div>
                <strong>Enable AI suggestions</strong>
                <span>Show helpful prompts and recommendations</span>
              </div>
              <button
                className="settings-switch"
                type="button"
                onClick={() => updateAiField('suggestions', !settings.ai.suggestions)}
                data-theme={settings.ai.suggestions ? 'dark' : 'light'}
                aria-label={settings.ai.suggestions ? 'Disable AI suggestions' : 'Enable AI suggestions'}
              >
                <span className="theme-icon">{settings.ai.suggestions ? <FiCheckCircle /> : <FiAlertTriangle />}</span>
                <span className="theme-switch" aria-hidden="true">
                  <span className="theme-thumb" />
                </span>
              </button>
            </div>
          </GlassCard>

          <GlassCard className="settings-card settings-span-6">
            <div className="settings-section-header">
              <div className="settings-section-icon"><FiHeart /></div>
              <div>
                <span className="settings-section-kicker">Health Profile</span>
                <h3>Health profile</h3>
                <p>Help the assistant tailor guidance to your profile.</p>
              </div>
            </div>

            <div className="settings-formGrid">
              <label className="settings-field">
                <span>Age</span>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={settings.health.age}
                  onChange={(event) => updateHealthField('age', event.target.value)}
                  placeholder="Age"
                />
              </label>
              <label className="settings-field">
                <span>Gender</span>
                <select
                  value={settings.health.gender}
                  onChange={(event) => updateHealthField('gender', event.target.value)}
                >
                  {GENDER_OPTIONS.map((gender) => (
                    <option key={gender} value={gender}>{gender}</option>
                  ))}
                </select>
              </label>
              <label className="settings-field settings-field-full">
                <span>Existing conditions</span>
                <textarea
                  rows="4"
                  value={settings.health.conditions}
                  onChange={(event) => updateHealthField('conditions', event.target.value)}
                  placeholder="Type any conditions, medications, or notes..."
                />
              </label>
            </div>
          </GlassCard>

          <GlassCard className="settings-card settings-span-6">
            <div className="settings-section-header">
              <div className="settings-section-icon"><FiDatabase /></div>
              <div>
                <span className="settings-section-kicker">Privacy</span>
                <h3>Data & privacy</h3>
                <p>Manage your local export and prediction history.</p>
              </div>
            </div>

            <div className="settings-actionStack">
              <button type="button" className="settings-secondaryButton settings-wideButton" onClick={handleClearHistory} disabled={historyClearing}>
                <FiRefreshCw />
                {historyClearing ? 'Clearing history...' : 'Clear Prediction History'}
              </button>
              <button type="button" className="settings-secondaryButton settings-wideButton" onClick={handleDownloadData}>
                <FiDownload />
                Download My Data
              </button>
            </div>
          </GlassCard>

          <GlassCard className="settings-card settings-span-12 settings-dangerCard">
            <div className="settings-section-header">
              <div className="settings-section-icon danger"><FiShield /></div>
              <div>
                <span className="settings-section-kicker danger">Danger Zone</span>
                <h3>Danger Zone</h3>
                <p>Delete this account from the device and remove local data.</p>
              </div>
            </div>

            <div className="settings-dangerBody">
              <p>
                This will clear your stored preferences on this device and log you out. If server-side deletion is available for your account, it will be attempted as well.
              </p>
              <button type="button" className="settings-dangerButton" onClick={() => setShowDeleteDialog(true)}>
                <FiTrash2 />
                Delete Account
              </button>
            </div>
          </GlassCard>
        </div>
      </GlassCard>

      {showDeleteDialog && (
        <div className="settings-modalOverlay" role="presentation" onClick={() => !deleting && setShowDeleteDialog(false)}>
          <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onClick={(event) => event.stopPropagation()}>
            <div className="settings-modalHeader">
              <div className="settings-modalIcon"><FiAlertTriangle /></div>
              <div>
                <h4 id="delete-account-title">Delete account?</h4>
                <p>This will remove local settings, sign you out, and attempt server-side deletion where available.</p>
              </div>
            </div>
            <div className="settings-modalActions">
              <button type="button" className="settings-secondaryButton" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className="settings-dangerButton" onClick={handleDeleteAccount} disabled={deleting}>
                <FiTrash2 />
                {deleting ? 'Deleting...' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage
