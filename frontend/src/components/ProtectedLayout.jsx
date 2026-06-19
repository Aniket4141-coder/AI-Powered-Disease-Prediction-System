import { Outlet } from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary'
import AppShell from './AppShell'

const ProtectedLayout = ({ meta }) => (
  <AppShell meta={meta}>
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  </AppShell>
)

export default ProtectedLayout
