function FormField({ label, error, hint, required = false, id, children, className = '' }) {
  return (
    <div className={`ui-field${className ? ` ${className}` : ''}`}>
      {label && (
        <label className="ui-field__label" htmlFor={id}>
          {label}
          {required && (
            <span className="ui-field__required" aria-hidden="true">&nbsp;*</span>
          )}
        </label>
      )}
      {children}
      {hint && !error && <p className="ui-field__hint">{hint}</p>}
      {error && (
        <p className="ui-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default FormField