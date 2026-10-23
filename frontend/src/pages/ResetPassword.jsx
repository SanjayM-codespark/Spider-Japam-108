import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../api.js'

function ResetPassword() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    // Validate token on mount
    useEffect(() => {
        if (!token) {
            setError('Invalid or missing reset token. Please request a new reset link.')
        }
    }, [token])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!token) {
            setError('Invalid or missing reset token.')
            return
        }

        setError('')

        if (!password) {
            setError('Enter your new password.')
            return
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }
        if (!confirmPassword) {
            setError('Confirm your new password.')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)
        try {
            const response = await apiFetch('/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            })
            const data = await response.json()

            if (!data.success) {
                setError(data.message || 'Failed to reset password.')
                setLoading(false)
                return
            }

            setSuccess(true)
            setLoading(false)

            // Redirect to landing page after a moment
            setTimeout(() => {
                // Clear any existing admin token
                localStorage.removeItem('naamjap_token')
                localStorage.removeItem('naamjap_admin')
                navigate('/')
            }, 2000)
        } catch {
            setError('Could not reach the server. Please try again later.')
            setLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="reset-password-container">
                <div className="ui-card reset-password-card">
                    <div className="ui-card__body">
                        <div className="reset-password-header">
                            <h1 className="ui-card__title">Reset Password</h1>
                        </div>
                        <div className="reset-password-body">
                            <p className="ui-card__subtitle">Invalid or missing reset token.</p>
                            <p className="ui-card__subtitle" style={{marginTop: '8px', color: 'var(--text)'}}>
                                Please request a new reset link.
                            </p>
                            <div className="demo__gap" />
                            <a href="/admin" className="ui-btn ui-btn--primary">
                                Back to Login
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="reset-password-container">
            <div className="ui-card reset-password-card">
                <div className="ui-card__body">
                    {success ? (
                        <div className="reset-password-success">
                            <div className="reset-password-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            </div>
                            <h1 className="ui-card__title" style={{marginTop: '16px', marginBottom: '8px'}}>
                                Password Reset Successful
                            </h1>
                            <p className="ui-card__subtitle">
                                Your password has been reset. Redirecting to login...
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="reset-password-header">
                                <h1 className="ui-card__title">Set New Password</h1>
                                <p className="ui-card__subtitle">
                                    Your new password must be at least 6 characters.
                                </p>
                            </div>

                            {error && (
                                <div className="reset-password-error" role="alert">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="ui-form">
                                <div className="ui-field">
                                    <label htmlFor="password" className="ui-field__label">
                                        New Password
                                    </label>
                                    <div className="ui-password">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            id="password"
                                            className="ui-input ui-password__input"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter new password"
                                            autoComplete="new-password"
                                            required
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            className="ui-password__toggle"
                                            onClick={() => setShowNewPassword(v => !v)}
                                            aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showNewPassword ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                </svg>
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="ui-field">
                                    <label htmlFor="confirmPassword" className="ui-field__label">
                                        Confirm Password
                                    </label>
                                    <div className="ui-password">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            id="confirmPassword"
                                            className="ui-input ui-password__input"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password"
                                            autoComplete="new-password"
                                            required
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            className="ui-password__toggle"
                                            onClick={() => setShowConfirmPassword(v => !v)}
                                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showConfirmPassword ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                </svg>
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="demo__gap" />
                                <button type="submit" className="ui-btn ui-btn--primary ui-btn--lg" disabled={loading} style={{width: '100%'}}>
                                    {loading ? (
                                        <>
                                            <span className="ui-spinner" />
                                            Resetting...
                                        </>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ResetPassword