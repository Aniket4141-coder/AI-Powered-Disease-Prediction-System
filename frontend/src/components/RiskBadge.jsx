const RiskBadge = ({ tone = 'success', label }) => (
  <span className={`risk-badge ${tone}`}>{label}</span>
)

export default RiskBadge
