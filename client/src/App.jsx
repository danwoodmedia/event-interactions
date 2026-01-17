import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { supabase } from './lib/supabase'
import { signInWithMagicLink, signOut, onAuthStateChange } from './lib/auth'
import './App.css'

const socket = io('http://localhost:3001')

function App() {
  const [connected, setConnected] = useState(false)
  const [serverResponse, setServerResponse] = useState(null)
  const [dbStatus, setDbStatus] = useState(null)
  const [dbLoading, setDbLoading] = useState(false)

  // Auth state
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [authMessage, setAuthMessage] = useState(null)

  // Check for existing session and listen for changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })

    // Listen for auth changes
    const subscription = onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'SIGNED_IN') {
        setAuthMessage({ type: 'success', text: 'Successfully signed in!' })
      } else if (event === 'SIGNED_OUT') {
        setAuthMessage({ type: 'info', text: 'Signed out' })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    socket.on('test-response', (data) => {
      console.log('Received from server:', data)
      setServerResponse(data)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('test-response')
    }
  }, [])

  const sendTestMessage = () => {
    socket.emit('test', { message: 'Hello from React!', timestamp: new Date().toISOString() })
  }

  const testDatabaseConnection = async () => {
    setDbLoading(true)
    setDbStatus(null)

    try {
      const { error } = await supabase
        .from('organizations')
        .select('count')
        .limit(1)

      if (error) {
        setDbStatus({ success: false, message: error.message })
      } else {
        setDbStatus({ success: true, message: 'Client database connection successful!' })
      }
    } catch (err) {
      setDbStatus({ success: false, message: err.message })
    } finally {
      setDbLoading(false)
    }
  }

  const testServerDatabase = async () => {
    setDbLoading(true)
    setDbStatus(null)

    try {
      const response = await fetch('http://localhost:3001/api/test-db')
      const data = await response.json()

      if (data.status === 'success') {
        setDbStatus({ success: true, message: 'Server database connection successful!' })
      } else {
        setDbStatus({ success: false, message: data.error || data.message })
      }
    } catch (err) {
      setDbStatus({ success: false, message: err.message })
    } finally {
      setDbLoading(false)
    }
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setAuthMessage(null)

    if (!email) {
      setAuthMessage({ type: 'error', text: 'Please enter your email' })
      return
    }

    const { error } = await signInWithMagicLink(email)

    if (error) {
      setAuthMessage({ type: 'error', text: error.message })
    } else {
      setAuthMessage({ type: 'success', text: 'Check your email for the magic link!' })
      setEmail('')
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  if (authLoading) {
    return <div style={{ padding: '20px' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px' }}>
      <h1>Event Interactions</h1>

      {/* Auth Section */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Authentication</h3>

        {session ? (
          <div>
            <p style={{ color: 'green' }}>Signed in as: <strong>{session.user.email}</strong></p>
            <button onClick={handleSignOut}>Sign Out</button>
          </div>
        ) : (
          <form onSubmit={handleMagicLink}>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: '8px', width: '250px', marginRight: '10px' }}
              />
              <button type="submit">Send Magic Link</button>
            </div>
          </form>
        )}

        {authMessage && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: authMessage.type === 'success' ? '#d4edda' :
                           authMessage.type === 'error' ? '#f8d7da' : '#cce5ff',
            color: authMessage.type === 'success' ? '#155724' :
                   authMessage.type === 'error' ? '#721c24' : '#004085',
            borderRadius: '4px'
          }}>
            {authMessage.text}
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div style={{ marginBottom: '20px' }}>
        <strong>Socket.IO Status: </strong>
        <span style={{ color: connected ? 'green' : 'red' }}>
          {connected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>

      {/* Socket.IO Test */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Socket.IO Test</h3>
        <button onClick={sendTestMessage} disabled={!connected}>
          Send Test Message to Server
        </button>

        {serverResponse && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f0f0' }}>
            <strong>Server Response:</strong>
            <pre>{JSON.stringify(serverResponse, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Database Test */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Database Connection Test</h3>
        <div style={{ marginBottom: '10px' }}>
          <button onClick={testDatabaseConnection} disabled={dbLoading} style={{ marginRight: '10px' }}>
            {dbLoading ? 'Testing...' : 'Test Client → Supabase'}
          </button>
          <button onClick={testServerDatabase} disabled={dbLoading}>
            {dbLoading ? 'Testing...' : 'Test Server → Supabase'}
          </button>
        </div>

        {dbStatus && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: dbStatus.success ? '#d4edda' : '#f8d7da',
            color: dbStatus.success ? '#155724' : '#721c24',
            borderRadius: '4px'
          }}>
            {dbStatus.success ? '✓ ' : '✗ '}{dbStatus.message}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
