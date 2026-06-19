import { useEffect, useMemo } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { AnimatePresence, motion } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import PublicLayout from './components/PublicLayout'
import ProtectedLayout from './components/ProtectedLayout'
import DashboardPage from './pages/DashboardPage'
import PredictPage from './pages/PredictPage'
import ResultPage from './pages/ResultPage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import ChatPage from './pages/ChatPage'
import AdminPage from './pages/AdminPage'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Register from './pages/Register'
import { useInitialState } from './lib/useInitialState'
import { mapFlashToToast } from './lib/flash'

const App = () => {
  const initialState = useInitialState()
  const location = useLocation()

  useEffect(() => {
    if (!initialState.flash?.length) return
    initialState.flash.forEach((item) => {
      const { type, message } = mapFlashToToast(item)
      toast[type](message, {
        duration: 4000
      })
    })
  }, [initialState.flash])

  useEffect(() => {
    const storedTheme = window.sessionStorage.getItem('theme-preference') || 'light'
    document.documentElement.setAttribute('data-theme', storedTheme)
  }, [])

  useEffect(() => {
    if (!initialState.meta?.title) return
    document.title = `MediPredict AI | ${initialState.meta.title}`
  }, [initialState.meta?.title])

  const pageContent = useMemo(() => (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Routes location={location}>
        <Route element={<PublicLayout meta={initialState.meta} />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedLayout meta={initialState.meta} />}>
            <Route path="/dashboard" element={<DashboardPage data={initialState.data} />} />
            <Route path="/predict" element={<PredictPage data={initialState.data} />} />
            <Route path="/result" element={<ResultPage data={initialState.data} />} />
            <Route path="/history" element={<HistoryPage data={initialState.data} />} />
            <Route path="/profile" element={<ProfilePage data={initialState.data} />} />
            <Route path="/settings" element={<SettingsPage data={initialState.data} />} />
            <Route path="/chat" element={<ChatPage />} />
          </Route>
        </Route>

        <Route element={<AdminRoute />}>
          <Route element={<ProtectedLayout meta={initialState.meta} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </motion.div>
  ), [initialState.data, initialState.meta, location])

  return (
    <>
      <AnimatePresence mode="wait">
        {pageContent}
      </AnimatePresence>
      <Toaster position="top-right" />
    </>
  )
}

export default App
