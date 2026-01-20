import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import AVTech from '../pages/AVTech'
import './AVTechPasswordGate.css'

function AVTechPasswordGate() {
  const { eventId } = useParams()
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const socketRef = useRef(null)

  // Check session storage for existing auth
  useEffect(() => {
    const sessionAuth = sessionStorage.getItem(`avtech_auth_${eventId}`)
    if (sessionAuth === 'true') {
      setAuthenticated(true)
    }
  }, [eventId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Connect to socket and verify password
    const socket = io('http://localhost:3001')
    socketRef.current = socket

    socket.emit('avtech:verify-password', {
      eventId,
      password
    })

    socket.once('avtech:password-verified', ({ success }) => {
      if (success) {
        setAuthenticated(true)
        sessionStorage.setItem(`avtech_auth_${eventId}`, 'true')
        socket.disconnect()
      } else {
        setError('Incorrect password')
        setLoading(false)
        socket.disconnect()
      }
    })

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!authenticated) {
        setError('Connection timeout. Please try again.')
        setLoading(false)
        if (socketRef.current) {
          socketRef.current.disconnect()
        }
      }
    }, 5000)
  }

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  if (authenticated) {
    return <AVTech />
  }

  return (
    <div className="password-gate-container">
      <div className="password-gate-card">
        <h1>A/V Tech Panel Access</h1>
        <p>Event ID: <code>{eventId}</code></p>
        <p>Enter the password provided by the event producer</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            disabled={loading}
          />
          <button type="submit" disabled={loading || !password}>
            {loading ? 'Verifying...' : 'Access Panel'}
          </button>
        </form>

        <div className="password-gate-footer">
          <p>Need help? Contact the event producer</p>
        </div>
      </div>
    </div>
  )
}

export default AVTechPasswordGate
