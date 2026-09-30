function StatCard({ label, value, icon, trend, trendDirection = 'up' }) {
  return (
    <div className="ui-stat">
      {icon && <div className="ui-stat__icon">{icon}</div>}
      <div>
        <p className="ui-stat__label">{label}</p>
        <p className="ui-stat__value">{value}</p>
      </div>
      {trend && (
        <span className={`ui-stat__trend ui-stat__trend--${trendDirection}`}>{trend}</span>
      )}
    </div>
  )
}

export default StatCard