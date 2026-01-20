import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Login.css'

function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'producer' // default to producer
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role
          }
        }
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (data.session) {
        // Auto-login successful, show success message
        setMessage('Account created successfully! Redirecting...')
        setTimeout(() => {
          window.location.href = '/producer'
        }, 1500)
      } else {
        // Email confirmation required
        setMessage('Account created! Please check your email to verify your account.')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Signup error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Create Producer Account</h1>
          <p>Sign up to create and manage events</p>
        </div>

        {error && (
          <div className="login-alert login-alert--error">
            {error}
          </div>
        )}

        {message && (
          <div className="login-alert login-alert--success">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="John Doe"
              required
              disabled={loading}
              autoComplete="name"
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
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
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Create a password"
              required
              minLength={6}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="login-button login-button--primary"
            disabled={loading || !formData.email || !formData.name || !formData.password}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="login-link">
              Log in
            </Link>
          </p>
          <p className="signup-note">
            Your password must be at least 6 characters long.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup
