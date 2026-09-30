import { useState } from 'react'

function PasswordInput({ className = '', error = false, ...rest }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={`ui-password${className ? ` ${className}` : ''}`}>
      <input
        className={`ui-input ui-password__input${error ? ' ui-input--error' : ''}`}
        type={visible ? 'text' : 'password'}
        {...rest}
      />
      <button
        type="button"
        className="ui-password__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide secret' : 'Show secret'}
        tabIndex={-1}
      >
        {visible ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M1 12s4.1-6.5 11-6.5S23 12 23 12s-4.1 6.5-11 6.5S1 12 1 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0112 18.5C5.1 18.5 1 12 1 12a19.7 19.7 0 015.06-5.94" />
            <path d="M11.3 4.3A10.3 10.3 0 0112 4.5c6.9 0 11 7.5 11 7.5a19.4 19.4 0 01-3.8 4.6" />
            <path d="M9.9 9.9a3 3 0 104.24 4.24" />
            <path d="M1 1l22 22" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default PasswordInput