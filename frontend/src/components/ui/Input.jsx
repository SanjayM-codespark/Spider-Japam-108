function Input({ className = '', error = false, ...rest }) {
  return (
    <input
      className={`ui-input${error ? ' ui-input--error' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    />
  )
}

export default Input