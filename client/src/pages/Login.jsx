import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithPassword, signInWithOAuth } from '../lib/auth'
import './Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await signInWithPassword(email, password)

      if (error) {
        setError(error.message)
      } else if (data.session) {
        // Successfully logged in
        console.log('Login successful, session:', data.session)

        // Small delay to ensure session is fully stored
        setTimeout(() => {
          navigate('/producer')
        }, 100)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthLogin = async (provider) => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await signInWithOAuth(provider)

      if (error) {
        setError(error.message)
      }
      // OAuth will redirect, so no need to handle success
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('OAuth error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Event Interactions</h1>
          <p>Producer Login</p>
        </div>

        {error && (
          <div className="login-alert login-alert--error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="login-button login-button--primary"
            disabled={loading || !email || !password}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <div className="login-oauth">
          <button
            onClick={() => handleOAuthLogin('google')}
            className="login-button login-button--oauth"
            disabled={loading}
          >
            <svg className="login-oauth-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => handleOAuthLogin('azure')}
            className="login-button login-button--oauth"
            disabled={loading}
          >
            <svg className="login-oauth-icon" viewBox="0 0 24 24">
              <path fill="#00A4EF" d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
            </svg>
            Continue with Microsoft
          </button>
        </div>

        <div className="login-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="login-link">
              Sign up
            </Link>
          </p>
          <p>
            Join as audience?{' '}
            <Link to="/audience" className="login-link">
              Enter event code
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
