import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getSession, onAuthStateChange } from '../lib/auth'

/**
 * ProtectedRoute component that checks authentication before rendering children
 * Redirects to login if user is not authenticated or doesn't have required role
 */
function ProtectedRoute({ children, requiredRole = null }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const location = useLocation()

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      const { session: currentSession } = await getSession()
      setSession(currentSession)
      setLoading(false)
    }

    checkSession()

    // Listen for auth changes
    const subscription = onAuthStateChange((event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Show loading state
  if (loading) {
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
          textAlign: 'center'
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
          <p style={{ margin: 0, color: '#718096' }}>Loading...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role if required
  if (requiredRole) {
    const userRole = session.user?.user_metadata?.role

    if (!userRole) {
      console.warn('User has no role defined')
      return <Navigate to="/login" state={{ from: location }} replace />
    }

    // Role hierarchy: admin > producer > audience
    const roleHierarchy = {
      admin: 3,
      producer: 2,
      audience: 1
    }

    const userLevel = roleHierarchy[userRole] || 0
    const requiredLevel = roleHierarchy[requiredRole] || 0

    if (userLevel < requiredLevel) {
      // User doesn't have required role
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
            <h2 style={{ margin: '0 0 16px', color: '#1a202c' }}>Access Denied</h2>
            <p style={{ margin: '0 0 24px', color: '#718096' }}>
              You don't have permission to access this page. Required role: {requiredRole}
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 600
              }}
            >
              Go Home
            </a>
          </div>
        </div>
      )
    }
  }

  // User is authenticated and has required role - render children
  return children
}

export default ProtectedRoute
