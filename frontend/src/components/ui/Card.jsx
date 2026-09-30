function Card({ title, subtitle, actions, children, className = '', ...rest }) {
  return (
    <div className={`ui-card${className ? ` ${className}` : ''}`} {...rest}>
      {(title || subtitle || actions) && (
        <div className="ui-card__header">
          <div>
            {title && <h3 className="ui-card__title">{title}</h3>}
            {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="ui-card__actions">{actions}</div>}
        </div>
      )}
      <div className="ui-card__body">{children}</div>
    </div>
  )
}

export default Card