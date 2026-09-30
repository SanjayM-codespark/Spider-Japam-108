function Textarea({ className = '', error = false, ...rest }) {
  return (
    <textarea
      className={`ui-textarea${error ? ' ui-textarea--error' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    />
  )
}

export default Textarea