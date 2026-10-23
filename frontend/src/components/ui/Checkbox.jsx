import { forwardRef } from 'react'

/**
 * Checkbox - a styled checkbox input.
 *
 * Uses a label wrapper so the entire row is clickable, not just the box.
 * The native checkbox is visually hidden but still handles focus/state.
 */
const Checkbox = forwardRef(function Checkbox({
    id,
    checked,
    onChange,
    disabled,
    className = '',
    ...props
}, ref) {
    return (
        <label
            className={`ui-checkbox ${className}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
            }}
        >
            <span className="ui-checkbox__box">
                <input
                    ref={ref}
                    type="checkbox"
                    id={id}
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                    {...props}
                    style={{
                        position: 'absolute',
                        opacity: 0,
                        width: 0,
                        height: 0,
                    }}
                />
                <span
                    className="ui-checkbox__icon"
                    style={{
                        display: 'inline-flex',
                        width: '1.25rem',
                        height: '1.25rem',
                        border: '2px solid #d1d5db',
                        borderRadius: '0.25rem',
                        backgroundColor: checked ? '#2563eb' : 'transparent',
                        color: 'white',
                        justifyContent: 'center',
                        alignItems: 'center',
                        transition: 'all 0.15s ease',
                    }}
                >
                    {checked && (
                        <svg
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            style={{ width: '0.875rem', height: '0.875rem' }}
                        >
                            <path d="M3 8l3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </span>
            </span>
        </label>
    )
})

Checkbox.displayName = 'Checkbox'

export default Checkbox