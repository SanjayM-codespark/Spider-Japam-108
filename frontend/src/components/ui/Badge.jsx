function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`ui-badge ui-badge--${variant}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  )
}

export default Badge