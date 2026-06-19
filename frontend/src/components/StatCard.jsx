const StatCard = ({ label, value, trend, icon: Icon }) => (
  <div className="glass-card stat-card">
    <div>
      <p className="stat-label">{label}</p>
      <h3>{value}</h3>
      {trend && <span className="stat-trend">{trend}</span>}
    </div>
    {Icon && <div className="stat-icon"><Icon /></div>}
  </div>
)

export default StatCard
