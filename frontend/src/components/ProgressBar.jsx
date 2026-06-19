import { useEffect, useState } from 'react'

const ProgressBar = ({ value, tone = 'success' }) => {
  const [animatedValue, setAnimatedValue] = useState(0)

  useEffect(() => {
    const next = Math.max(0, Math.min(100, Number(value) || 0))
    const frame = window.requestAnimationFrame(() => setAnimatedValue(next))
    return () => window.cancelAnimationFrame(frame)
  }, [value])

  return (
    <div className="progress">
      <div className={`progress-fill ${tone}`} style={{ width: `${animatedValue}%` }} />
    </div>
  )
}

export default ProgressBar
