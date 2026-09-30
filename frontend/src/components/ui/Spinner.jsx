function Spinner({ size = 'md', light = false }) {
  return (
    <span
      aria-hidden="true"
      className={`ui-spinner ui-spinner--${size}${light ? ' ui-spinner--light' : ''}`}
    />
  )
}

export default Spinner