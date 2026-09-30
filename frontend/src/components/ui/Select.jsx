function Select({ options = [], placeholder, value, className = '', ...rest }) {
  const hasValue = value !== '' && value !== undefined && value !== null
  return (
    <select
      className={`ui-select${hasValue ? '' : ' ui-select--placeholder'}${className ? ` ${className}` : ''}`}
      value={value ?? ''}
      {...rest}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label ?? option.value}
        </option>
      ))}
    </select>
  )
}

export default Select