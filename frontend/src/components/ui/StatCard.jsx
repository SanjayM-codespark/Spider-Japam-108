function StatCard({ label, value, icon }) {
  return (
    <div className="ui-stat">
      {icon && <div className="ui-stat__icon">{icon}</div>}
      <div>
        <p className="ui-stat__label">{label}</p>
        <p className="ui-stat__value">{value}</p>
      </div>
    </div>
  )
}

export default StatCard