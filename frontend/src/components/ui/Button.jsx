import Spinner from './Spinner.jsx'

function Button({
  children,
  href,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...rest
}) {
  const classes = `ui-btn ui-btn--${variant} ui-btn--${size}${loading ? ' ui-btn--loading' : ''}${className ? ` ${className}` : ''}`
  const content = (
    <>
      {loading && <Spinner size="sm" />}
      {children}
    </>
  )

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    )
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      {...rest}
    >
      {content}
    </button>
  )
}

export default Button