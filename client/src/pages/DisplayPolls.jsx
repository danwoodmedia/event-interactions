import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001')

function DisplayPolls() {
  const { displayId } = useParams()
  const [searchParams] = useSearchParams()

  // Display settings from URL params
  const mode = searchParams.get('mode') || 'transparent' // 'transparent' or 'chroma'
  const chromaColor = searchParams.get('chroma') || '#00FF00'
  const hideUI = searchParams.get('hideUI') === 'true'

  const [connected, setConnected] = useState(false)
  const [displayPoll, setDisplayPoll] = useState(null)

  // Settings from A/V Tech panel
  const [pollPosition, setPollPosition] = useState('center')
  const [pollSize, setPollSize] = useState('medium')

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
      console.log('DisplayPolls connected to server')
      setConnected(true)

      socket.emit('join-display', {
        displayId: displayId || 'polls',
        eventId
      })
    })

    socket.on('disconnect', () => {
      console.log('DisplayPolls disconnected from server')
      setConnected(false)
    })

    socket.on('settings:sync', (settings) => {
      if (settings.pollPosition) setPollPosition(settings.pollPosition)
      if (settings.pollSize) setPollSize(settings.pollSize)
    })

    socket.on('poll:display', ({ poll }) => {
      setDisplayPoll(poll)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('settings:sync')
      socket.off('poll:display')
    }
  }, [displayId])

  const getBackgroundStyle = () => {
    if (mode === 'chroma') {
      return { backgroundColor: chromaColor }
    }
    return { backgroundColor: 'transparent' }
  }

  // Get poll position styles based on A/V Tech setting
  const getPollPositionStyle = (position) => {
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

  const getPollSizeMultiplier = (size) => {
    switch (size) {
      case 'small': return 0.75
      case 'large': return 1.25
      default: return 1
    }
  }

  const getPollCardStyle = (position, size) => {
    const sizeMultiplier = getPollSizeMultiplier(size)

    const baseStyle = {
      background: 'rgba(15, 15, 26, 0.95)',
      padding: `${Math.round(32 * sizeMultiplier)}px ${Math.round(40 * sizeMultiplier)}px`,
      boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
      backdropFilter: 'blur(20px)'
    }

    switch (position) {
      case 'bottom-bar':
        return {
          ...baseStyle,
          borderRadius: 16,
          padding: `${Math.round(20 * sizeMultiplier)}px ${Math.round(40 * sizeMultiplier)}px`,
          width: '100%',
          maxWidth: 'none',
          minWidth: 'auto',
          maxHeight: 200 * sizeMultiplier,
          overflow: 'hidden',
          boxSizing: 'border-box'
        }
      case 'lower-third':
        return {
          ...baseStyle,
          borderRadius: 24,
          minWidth: Math.round(500 * sizeMultiplier),
          maxWidth: Math.round(800 * sizeMultiplier)
        }
      case 'top-right':
      case 'top-left':
      case 'bottom-right':
      case 'bottom-left':
        return {
          ...baseStyle,
          borderRadius: 20,
          minWidth: Math.round(350 * sizeMultiplier),
          maxWidth: Math.round(450 * sizeMultiplier),
          padding: `${Math.round(24 * sizeMultiplier)}px ${Math.round(32 * sizeMultiplier)}px`
        }
      default:
        return {
          ...baseStyle,
          borderRadius: 24,
          minWidth: Math.round(500 * sizeMultiplier),
          maxWidth: Math.round(700 * sizeMultiplier)
        }
    }
  }

  const getPollFontSizes = (size) => {
    const sizeMultiplier = getPollSizeMultiplier(size)
    return {
      question: Math.round(28 * sizeMultiplier),
      option: Math.round(18 * sizeMultiplier),
      percentage: Math.round(20 * sizeMultiplier),
      status: Math.round(14 * sizeMultiplier),
      total: Math.round(14 * sizeMultiplier),
      letterBox: Math.round(32 * sizeMultiplier),
      letterFont: Math.round(16 * sizeMultiplier)
    }
  }

  const getPollAnimation = (position) => {
    switch (position) {
      case 'bottom-bar':
      case 'lower-third':
        return 'pollSlideUpCentered'
      case 'bottom-right':
      case 'bottom-left':
        return 'pollSlideUp'
      case 'top-right':
      case 'top-left':
        return 'pollSlideDown'
      default:
        return 'pollSlideIn'
    }
  }

  return (
    <div
      className={`display-page ${mode === 'transparent' ? 'display-transparent' : 'display-chroma'}`}
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
          Polls Only | Mode: {mode}
        </div>
      )}

      {/* Poll overlay */}
      {displayPoll && (() => {
        const fontSizes = getPollFontSizes(pollSize)
        const sizeMultiplier = getPollSizeMultiplier(pollSize)

        return (
          <div style={{
            ...getPollPositionStyle(pollPosition),
            animation: `${getPollAnimation(pollPosition)} 0.5s ease-out forwards`
          }}>
            <div style={getPollCardStyle(pollPosition, pollSize)}>
              {/* Status indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: Math.round(20 * sizeMultiplier)
              }}>
                {displayPoll.status === 'live' && (
                  <>
                    <span style={{
                      width: Math.round(10 * sizeMultiplier),
                      height: Math.round(10 * sizeMultiplier),
                      borderRadius: '50%',
                      background: '#22c55e',
                      animation: 'pollPulse 1.5s infinite'
                    }} />
                    <span style={{ color: '#22c55e', fontSize: fontSizes.status, fontWeight: 600 }}>
                      VOTING OPEN
                    </span>
                  </>
                )}
                {displayPoll.status === 'closed' && (
                  <span style={{ color: '#6b7280', fontSize: fontSizes.status, fontWeight: 600 }}>
                    VOTING CLOSED
                  </span>
                )}
              </div>

              {/* Question */}
              <h2 style={{
                color: '#fff',
                fontSize: fontSizes.question,
                fontWeight: 700,
                textAlign: 'center',
                margin: `0 0 ${Math.round(24 * sizeMultiplier)}px 0`,
                lineHeight: 1.3
              }}>
                {displayPoll.question}
              </h2>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: pollPosition === 'bottom-bar' ? 'row' : 'column', gap: Math.round(12 * sizeMultiplier), flexWrap: 'wrap', justifyContent: 'center' }}>
                {displayPoll.options.map((option, index) => {
                  const votes = displayPoll.results?.voteCounts?.[option.id] || 0
                  const total = displayPoll.results?.totalVotes || 0
                  const percentage = total > 0 ? Math.round((votes / total) * 100) : 0
                  const isCorrect = option.isCorrect && displayPoll.showResults

                  return (
                    <div
                      key={option.id}
                      style={{
                        position: 'relative',
                        background: isCorrect ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.08)',
                        borderRadius: Math.round(12 * sizeMultiplier),
                        padding: `${Math.round(16 * sizeMultiplier)}px ${Math.round(20 * sizeMultiplier)}px`,
                        overflow: 'hidden',
                        animation: `pollOptionFadeIn 0.4s ease-out ${index * 0.1}s both`,
                        flex: pollPosition === 'bottom-bar' ? '1 1 auto' : 'none',
                        minWidth: pollPosition === 'bottom-bar' ? 120 : 'auto',
                        border: isCorrect ? '2px solid rgba(34, 197, 94, 0.5)' : 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Result bar */}
                      {displayPoll.showResults && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          bottom: 0,
                          width: `${percentage}%`,
                          background: isCorrect
                            ? 'linear-gradient(90deg, rgba(34,197,94,0.4) 0%, rgba(34,197,94,0.2) 100%)'
                            : 'linear-gradient(90deg, rgba(165,180,252,0.3) 0%, rgba(165,180,252,0.15) 100%)',
                          borderRadius: Math.round(12 * sizeMultiplier),
                          transition: 'width 0.8s ease-out',
                          animation: 'pollBarGrow 0.8s ease-out'
                        }} />
                      )}

                      {/* Content */}
                      <div style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: Math.round(14 * sizeMultiplier)
                      }}>
                        <span style={{
                          width: fontSizes.letterBox,
                          height: fontSizes.letterBox,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isCorrect ? 'rgba(34,197,94,0.3)' : 'rgba(165,180,252,0.2)',
                          borderRadius: Math.round(8 * sizeMultiplier),
                          fontSize: fontSizes.letterFont,
                          fontWeight: 700,
                          color: isCorrect ? '#22c55e' : '#a5b4fc',
                          flexShrink: 0
                        }}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span style={{
                          flex: 1,
                          fontSize: fontSizes.option,
                          color: '#fff',
                          fontWeight: 500
                        }}>
                          {option.text}
                        </span>
                        {isCorrect && (
                          <span style={{
                            color: '#22c55e',
                            fontSize: fontSizes.percentage,
                            fontWeight: 700
                          }}>
                            ✓
                          </span>
                        )}
                        {displayPoll.showResults && (
                          <span style={{
                            fontSize: fontSizes.percentage,
                            fontWeight: 700,
                            color: isCorrect ? '#22c55e' : '#a5b4fc',
                            minWidth: Math.round(60 * sizeMultiplier),
                            textAlign: 'right'
                          }}>
                            {percentage}%
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Total votes */}
              {displayPoll.showResults && (
                <div style={{
                  textAlign: 'center',
                  marginTop: Math.round(20 * sizeMultiplier),
                  fontSize: fontSizes.total,
                  color: 'rgba(255,255,255,0.5)'
                }}>
                  {displayPoll.results?.totalVotes || 0} total votes
                </div>
              )}
            </div>
          </div>
        )
      })()}

      <style>{`
        @keyframes pollSlideIn {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes pollSlideUp {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pollSlideUpCentered {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes pollSlideDown {
          0% {
            opacity: 0;
            transform: translateY(-30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pollOptionFadeIn {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pollBarGrow {
          0% {
            transform: scaleX(0);
            transform-origin: left;
          }
          100% {
            transform: scaleX(1);
            transform-origin: left;
          }
        }
        @keyframes pollPulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  )
}

export default DisplayPolls
