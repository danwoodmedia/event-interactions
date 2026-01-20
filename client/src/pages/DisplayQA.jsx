import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001')

function DisplayQA() {
  const { displayId } = useParams()
  const [searchParams] = useSearchParams()

  // Display settings from URL params
  const mode = searchParams.get('mode') || 'transparent' // 'transparent' or 'chroma'
  const chromaColor = searchParams.get('chroma') || '#00FF00'
  const hideUI = searchParams.get('hideUI') === 'true'

  const [connected, setConnected] = useState(false)
  const [featuredQuestion, setFeaturedQuestion] = useState(null)

  // Settings from A/V Tech panel
  const [qaPosition, setQaPosition] = useState('lower-third')
  const [qaSize, setQaSize] = useState('medium')

  // Set background on html, body, and root based on mode
  useEffect(() => {
    const root = document.getElementById('root')

    if (mode === 'transparent') {
      document.documentElement.style.background = 'transparent'
      document.documentElement.style.backgroundColor = 'transparent'
      document.body.style.background = 'transparent'
      document.body.style.backgroundColor = 'transparent'
      if (root) {
        root.style.background = 'transparent'
        root.style.backgroundColor = 'transparent'
      }
    } else if (mode === 'chroma') {
      document.documentElement.style.background = chromaColor
      document.documentElement.style.backgroundColor = chromaColor
      document.body.style.background = chromaColor
      document.body.style.backgroundColor = chromaColor
      if (root) {
        root.style.background = chromaColor
        root.style.backgroundColor = chromaColor
      }
    }

    return () => {
      document.documentElement.style.background = ''
      document.documentElement.style.backgroundColor = ''
      document.body.style.background = ''
      document.body.style.backgroundColor = ''
      if (root) {
        root.style.background = ''
        root.style.backgroundColor = ''
      }
    }
  }, [mode, chromaColor])

  const eventId = searchParams.get('eventId') || 'default'

  useEffect(() => {
    socket.on('connect', () => {
      console.log('DisplayQA connected to server')
      setConnected(true)

      socket.emit('join-display', {
        displayId: displayId || 'qa',
        eventId
      })
    })

    socket.on('disconnect', () => {
      console.log('DisplayQA disconnected from server')
      setConnected(false)
    })

    socket.on('settings:sync', (settings) => {
      if (settings.qaPosition) setQaPosition(settings.qaPosition)
      if (settings.qaSize) setQaSize(settings.qaSize)
    })

    socket.on('qa:featured', ({ question, position, size }) => {
      setFeaturedQuestion(question)
      // Update Q&A position/size if provided
      if (position) setQaPosition(position)
      if (size) setQaSize(size)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('settings:sync')
      socket.off('qa:featured')
    }
  }, [displayId])

  const getBackgroundStyle = () => {
    if (mode === 'chroma') {
      return { backgroundColor: chromaColor }
    }
    return { backgroundColor: 'transparent' }
  }

  // Get Q&A position styles (matches poll positioning exactly)
  const getQAPositionStyle = (position) => {
    const base = { position: 'absolute', zIndex: 500 }

    switch (position) {
      case 'center':
        return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
      case 'lower-third':
        return { ...base, bottom: '10%', left: '50%', transform: 'translateX(-50%)' }
      case 'bottom-bar':
        return { ...base, bottom: '3%', left: '50%', transform: 'translateX(-50%)', width: '75%' }
      case 'top-right':
        return { ...base, top: '5%', right: '5%' }
      case 'top-left':
        return { ...base, top: '5%', left: '5%' }
      case 'bottom-right':
        return { ...base, bottom: '5%', right: '5%' }
      case 'bottom-left':
        return { ...base, bottom: '5%', left: '5%' }
      default:
        return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }
  }

  const getQASizeMultiplier = (size) => {
    switch (size) {
      case 'small': return 0.75
      case 'large': return 1.25
      default: return 1
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        cursor: 'none',
        ...getBackgroundStyle()
      }}
    >
      {!connected && !hideUI && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          padding: '5px 10px',
          backgroundColor: 'rgba(255,0,0,0.8)',
          color: 'white',
          borderRadius: 4,
          fontSize: 12,
          zIndex: 9999
        }}>
          Disconnected
        </div>
      )}

      {!hideUI && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          padding: '5px 10px',
          backgroundColor: 'rgba(0,0,0,0.5)',
          color: 'white',
          borderRadius: 4,
          fontSize: 12,
          zIndex: 9999
        }}>
          Q&A Only | Mode: {mode}
        </div>
      )}

      {/* Featured Question overlay */}
      {featuredQuestion && (() => {
        const sizeMultiplier = getQASizeMultiplier(qaSize)

        // Get animation based on position (to preserve correct transform)
        const getAnimation = (pos) => {
          switch (pos) {
            case 'center':
              return 'qaSlideInCenter 0.5s ease-out forwards'
            case 'lower-third':
            case 'bottom-bar':
              return 'qaSlideUpCentered 0.5s ease-out forwards'
            case 'bottom-right':
            case 'bottom-left':
              return 'qaSlideUp 0.5s ease-out forwards'
            case 'top-right':
            case 'top-left':
              return 'qaSlideDown 0.5s ease-out forwards'
            default:
              return 'qaSlideUpCentered 0.5s ease-out forwards'
          }
        }

        return (
          <div style={{
            ...getQAPositionStyle(qaPosition),
            animation: getAnimation(qaPosition)
          }}>
            <div style={{
              background: 'rgba(15, 15, 26, 0.95)',
              borderRadius: Math.round(20 * sizeMultiplier),
              padding: `${Math.round(28 * sizeMultiplier)}px ${Math.round(40 * sizeMultiplier)}px`,
              minWidth: Math.round(450 * sizeMultiplier),
              maxWidth: Math.round(700 * sizeMultiplier),
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              borderLeft: '4px solid #a5b4fc'
            }}>
              {/* Q&A indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: Math.round(16 * sizeMultiplier)
              }}>
                <span style={{
                  fontSize: Math.round(20 * sizeMultiplier)
                }}>💬</span>
                <span style={{
                  color: '#a5b4fc',
                  fontSize: Math.round(14 * sizeMultiplier),
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Audience Question
                </span>
              </div>

              {/* Question text */}
              <p style={{
                color: '#fff',
                fontSize: Math.round(26 * sizeMultiplier),
                fontWeight: 500,
                margin: 0,
                lineHeight: 1.4
              }}>
                "{featuredQuestion.text}"
              </p>

              {/* Author */}
              <p style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: Math.round(16 * sizeMultiplier),
                margin: `${Math.round(16 * sizeMultiplier)}px 0 0 0`,
                fontStyle: 'italic'
              }}>
                — {featuredQuestion.authorName}
              </p>
            </div>
          </div>
        )
      })()}

      <style>{`
        @keyframes qaSlideInCenter {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes qaSlideUpCentered {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes qaSlideUp {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes qaSlideDown {
          0% {
            opacity: 0;
            transform: translateY(-30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default DisplayQA
