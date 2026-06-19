const LoadingOverlay = ({ show, message = 'Analyzing symptoms...' }) => {
  if (!show) return null

  return (
    <div className="loading-overlay">
      <div className="loading-card">
        <div className="spinner" />
        <p>{message}</p>
      </div>
    </div>
  )
}

export default LoadingOverlay
