import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button, Badge, FormField, Input } from '../components/ui/index.js'
import { usePageTitle } from '../usePageTitle.js'
import './AdminLogin.css'

const LOGIN_URL = 'http://localhost:5000/api/admin/login'

function AdminLogin() {
  usePageTitle('Admin Login')
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!username || !password) {
      setError('Please enter both username and password.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await response.json()

      if (data.success) {
        localStorage.setItem('naamjap_token', data.token)
        localStorage.setItem('naamjap_admin', JSON.stringify(data.admin))
        navigate('/admin/dashboard')
      } else {
        setError(data.message || 'Login failed.')
      }
    } catch {
      setError('Could not reach the backend. Make sure it is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      <main className="login__main">
        <div className="login__card">
          <Badge variant="info">Admin</Badge>
          <h1 className="login__title">Admin Login</h1>
          <p className="login__subtitle">Sign in to access the admin dashboard</p>

          {error && (
            <div className="login__error" role="alert">
              {error}
            </div>
          )}

          <form className="login__form" onSubmit={handleSubmit} noValidate>
            <FormField label="Username" required id="login-username">
              <Input
                id="login-username"
                autoComplete="username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </FormField>
            <div className="login__gap" />
            <FormField label="Password" required id="login-password">
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>

            <Button type="submit" size="lg" loading={loading} className="login__submit">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="login__back">
            <Link to="/">← Back to home</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default AdminLogin