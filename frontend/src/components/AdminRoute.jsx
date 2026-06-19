import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingOverlay from './LoadingOverlay'

const AdminRoute = () => {
  const location = useLocation()
  const { isLoading, isAuthenticated, isAdmin } = useAuth()

  if (isLoading) {
    return <LoadingOverlay show message="Checking admin access..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default AdminRoute
