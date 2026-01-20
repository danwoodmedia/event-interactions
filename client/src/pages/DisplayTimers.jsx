import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001')

function DisplayTimers() {
  const { displayId } = useParams()
  const [searchParams] = useSearchParams()

  // Display settings from URL params
  const mode = searchParams.get('mode') || 'transparent' // 'transparent' or 'chroma'
  const chromaColor = searchParams.get('chroma') || '#00FF00'
  const hideUI = searchParams.get('hideUI') === 'true'

  const [connected, setConnected] = useState(false)
  const [displayTimer, setDisplayTimer] = useState(null)

  // Settings from A/V Tech panel
  const [timerPosition, setTimerPosition] = useState('center')
  const [timerSize, setTimerSize] = useState('medium')
  const [timerStyle, setTimerStyle] = useState('digital')
  const [timerColor, setTimerColor] = useState('#ffffff')

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
      console.log('DisplayTimers connected to server')
      setConnected(true)

      socket.emit('join-display', {
        displayId: displayId || 'timers',
        eventId
      })
    })

    socket.on('disconnect', () => {
      console.log('DisplayTimers disconnected from server')
      setConnected(false)
    })

    socket.on('settings:sync', (settings) => {
      console.log('[DisplayTimers] Received settings:sync:', settings)
      if (settings.timerPosition) setTimerPosition(settings.timerPosition)
      if (settings.timerSize) setTimerSize(settings.timerSize)
      if (settings.timerStyle) {
        console.log('[DisplayTimers] Updating timerStyle to:', settings.timerStyle)
        setTimerStyle(settings.timerStyle)
      }
      if (settings.timerColor) {
        console.log('[DisplayTimers] Updating timerColor to:', settings.timerColor)
        setTimerColor(settings.timerColor)
      }
    })

    socket.on('timer:display', ({ timer, position, size, style, color }) => {
      console.log('[DisplayTimers] Received timer:display - style:', style, 'color:', color)
      setDisplayTimer(timer)
      // Update timer position/size/style/color if provided
      if (position) setTimerPosition(position)
      if (size) setTimerSize(size)
      if (style) setTimerStyle(style)
      if (color) setTimerColor(color)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('settings:sync')
      socket.off('timer:display')
    }
  }, [displayId])

  const getBackgroundStyle = () => {
    if (mode === 'chroma') {
      return { backgroundColor: chromaColor }
    }
    return { backgroundColor: 'transparent' }
  }

  // Get position styles
  const getPositionStyle = (position) => {
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

  const getSizeMultiplier = (size) => {
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
          Timers Only | Mode: {mode}
        </div>
      )}

      {/* Timer overlay */}
      {displayTimer && (() => {
        const elapsed = displayTimer.currentElapsed || 0
        const remaining = displayTimer.type === 'countdown'
          ? Math.max(0, displayTimer.duration - elapsed)
          : elapsed

        const totalSeconds = Math.floor(remaining / 1000)
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60

        const timeString = hours > 0
          ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

        // Use global settings for position/size (from settings:sync or timer:display)
        const positionStyle = getPositionStyle(timerPosition)
        const sizeMultiplier = getSizeMultiplier(timerSize)

        const isUrgent = displayTimer.type === 'countdown' && remaining <= 10000 && remaining > 0
        const isFinished = displayTimer.type === 'countdown' && remaining === 0

        // Get animation based on position (to preserve correct transform)
        const getAnimation = (pos) => {
          switch (pos) {
            case 'center':
              return 'timerSlideInCenter 0.5s ease-out forwards'
            case 'lower-third':
            case 'bottom-bar':
              return 'timerSlideUpCentered 0.5s ease-out forwards'
            case 'bottom-right':
            case 'bottom-left':
              return 'timerSlideUp 0.5s ease-out forwards'
            case 'top-right':
            case 'top-left':
              return 'timerSlideDown 0.5s ease-out forwards'
            default:
              return 'timerSlideInCenter 0.5s ease-out forwards'
          }
        }

        // Get the display color (use urgent red if urgent/finished, otherwise use timerColor)
        const displayColor = isFinished || isUrgent ? '#ef4444' : timerColor

        // Calculate progress for circular style (0 to 1)
        const progress = displayTimer.type === 'countdown'
          ? 1 - (remaining / displayTimer.duration)
          : Math.min(1, elapsed / (60 * 60 * 1000)) // For stopwatch, fill over 1 hour

        // Render based on timerStyle
        if (timerStyle === 'minimal') {
          // Minimal style - just the time, no container
          return (
            <div style={{
              ...positionStyle,
              animation: getAnimation(timerPosition)
            }}>
              <div style={{
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: Math.round(120 * sizeMultiplier),
                  fontWeight: 700,
                  color: displayColor,
                  fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace",
                  letterSpacing: '0.02em',
                  lineHeight: 1,
                  textShadow: '0 4px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)',
                  animation: isUrgent && !isFinished ? 'timerPulse 1s infinite' : 'none'
                }}>
                  {timeString}
                </div>
                {displayTimer.name && (
                  <div style={{
                    marginTop: Math.round(12 * sizeMultiplier),
                    fontSize: Math.round(24 * sizeMultiplier),
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 500,
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                  }}>
                    {displayTimer.name}
                  </div>
                )}
              </div>
            </div>
          )
        }

        if (timerStyle === 'circular') {
          // Circular style - timer with progress ring
          const circleSize = Math.round(280 * sizeMultiplier)
          const strokeWidth = Math.round(12 * sizeMultiplier)
          const radius = (circleSize - strokeWidth) / 2
          const circumference = 2 * Math.PI * radius
          const strokeDashoffset = circumference * (1 - progress)

          return (
            <div style={{
              ...positionStyle,
              animation: getAnimation(timerPosition)
            }}>
              <div style={{
                position: 'relative',
                width: circleSize,
                height: circleSize
              }}>
                {/* Background circle */}
                <svg
                  width={circleSize}
                  height={circleSize}
                  style={{ position: 'absolute', top: 0, left: 0 }}
                >
                  <circle
                    cx={circleSize / 2}
                    cy={circleSize / 2}
                    r={radius}
                    fill="rgba(15, 15, 26, 0.95)"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={strokeWidth}
                  />
                  {/* Progress circle */}
                  <circle
                    cx={circleSize / 2}
                    cy={circleSize / 2}
                    r={radius}
                    fill="none"
                    stroke={displayColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
                    style={{
                      transition: 'stroke-dashoffset 0.1s linear',
                      filter: `drop-shadow(0 0 10px ${displayColor}40)`
                    }}
                  />
                </svg>
                {/* Timer text in center */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    fontSize: Math.round(56 * sizeMultiplier),
                    fontWeight: 700,
                    color: displayColor,
                    fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace",
                    letterSpacing: '0.02em',
                    lineHeight: 1,
                    animation: isUrgent && !isFinished ? 'timerPulse 1s infinite' : 'none'
                  }}>
                    {timeString}
                  </div>
                  {displayTimer.name && (
                    <div style={{
                      marginTop: Math.round(8 * sizeMultiplier),
                      fontSize: Math.round(16 * sizeMultiplier),
                      color: 'rgba(255,255,255,0.7)',
                      fontWeight: 500,
                      maxWidth: '80%',
                      textAlign: 'center'
                    }}>
                      {displayTimer.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }

        // Default: Digital style (original)
        return (
          <div style={{
            ...positionStyle,
            animation: getAnimation(timerPosition)
          }}>
            <div style={{
              background: 'rgba(15, 15, 26, 0.95)',
              padding: `${Math.round(40 * sizeMultiplier)}px ${Math.round(60 * sizeMultiplier)}px`,
              borderRadius: Math.round(24 * sizeMultiplier),
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              minWidth: Math.round(300 * sizeMultiplier)
            }}>
              {/* Timer status indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: Math.round(16 * sizeMultiplier)
              }}>
                {displayTimer.status === 'running' && !isFinished && (
                  <>
                    <span style={{
                      width: Math.round(10 * sizeMultiplier),
                      height: Math.round(10 * sizeMultiplier),
                      borderRadius: '50%',
                      background: isUrgent ? '#ef4444' : displayColor,
                      animation: 'timerPulse 1.5s infinite'
                    }} />
                    <span style={{
                      color: isUrgent ? '#ef4444' : displayColor,
                      fontSize: Math.round(14 * sizeMultiplier),
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {displayTimer.type === 'countdown' ? 'COUNTDOWN' : 'STOPWATCH'}
                    </span>
                  </>
                )}
                {displayTimer.status === 'paused' && (
                  <>
                    <span style={{
                      width: Math.round(10 * sizeMultiplier),
                      height: Math.round(10 * sizeMultiplier),
                      borderRadius: '50%',
                      background: '#f59e0b'
                    }} />
                    <span style={{
                      color: '#f59e0b',
                      fontSize: Math.round(14 * sizeMultiplier),
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      PAUSED
                    </span>
                  </>
                )}
                {isFinished && (
                  <>
                    <span style={{
                      width: Math.round(10 * sizeMultiplier),
                      height: Math.round(10 * sizeMultiplier),
                      borderRadius: '50%',
                      background: '#ef4444'
                    }} />
                    <span style={{
                      color: '#ef4444',
                      fontSize: Math.round(14 * sizeMultiplier),
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      TIME'S UP!
                    </span>
                  </>
                )}
              </div>

              {/* Time display */}
              <div style={{
                color: displayColor,
                fontSize: Math.round(96 * sizeMultiplier),
                fontWeight: 700,
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
                animation: isUrgent ? 'timerPulse 0.5s infinite' : 'none'
              }}>
                {timeString}
              </div>

              {/* Timer name */}
              {displayTimer.name && (
                <div style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: Math.round(20 * sizeMultiplier),
                  marginTop: Math.round(12 * sizeMultiplier),
                  fontWeight: 500
                }}>
                  {displayTimer.name}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      <style>{`
        @keyframes timerSlideInCenter {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes timerSlideUpCentered {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes timerSlideUp {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes timerSlideDown {
          0% {
            opacity: 0;
            transform: translateY(-30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes timerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

export default DisplayTimers
