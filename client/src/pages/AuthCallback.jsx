import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function AuthCallback() {
  const [status, setStatus] = useState('Processing...')
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          setStatus(`Error: ${error.message}`)
          setTimeout(() => navigate('/login'), 3000)
          return
        }

        if (session) {
          // Redirect all authenticated users to producer panel
          navigate('/producer')
        } else {
          setStatus('No session found. Redirecting to login...')
          setTimeout(() => navigate('/login'), 2000)
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setStatus('An error occurred. Redirecting to login...')
        setTimeout(() => navigate('/login'), 3000)
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #667eea',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          margin: '0 auto 20px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <h2 style={{ margin: '0 0 8px', color: '#1a202c' }}>Authenticating</h2>
        <p style={{ margin: 0, color: '#718096' }}>{status}</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}

export default AuthCallback
