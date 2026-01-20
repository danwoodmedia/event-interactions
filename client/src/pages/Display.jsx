import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001')

function Display() {
  const { displayId } = useParams()
  const [searchParams] = useSearchParams()

  // Display settings from URL params
  const mode = searchParams.get('mode') || 'transparent' // 'transparent' or 'chroma'
  const chromaColor = searchParams.get('chroma') || '#00FF00'
  const hideUI = searchParams.get('hideUI') === 'true' // Hide test indicators

  const [connected, setConnected] = useState(false)
  const [testEmojis, setTestEmojis] = useState([])

  // Poll display state
  const [displayPoll, setDisplayPoll] = useState(null)

  // Q&A display state
  const [featuredQuestion, setFeaturedQuestion] = useState(null)

  // Timer display state (supports up to 3 simultaneous timers)
  const [displayTimers, setDisplayTimers] = useState([])

  // Settings from A/V Tech panel
  const [emojiSize, setEmojiSize] = useState('medium') // small, medium, large
  const [animationSpeed, setAnimationSpeed] = useState('normal') // slow, normal, fast
  const [spawnDirection, setSpawnDirection] = useState('bottom-up') // bottom-up, top-down
  const [spawnPosition, setSpawnPosition] = useState('wide') // left, right, wide
  const [pollPosition, setPollPosition] = useState('center') // center, lower-third, etc.
  const [pollSize, setPollSize] = useState('medium') // small, medium, large
  const [qaPosition, setQaPosition] = useState('lower-third')
  const [qaSize, setQaSize] = useState('medium')

  // Refs to hold current settings values (avoids stale closure issue)
  const emojiSizeRef = useRef(emojiSize)
  const animationSpeedRef = useRef(animationSpeed)
  const spawnDirectionRef = useRef(spawnDirection)
  const spawnPositionRef = useRef(spawnPosition)

  // Keep refs in sync with state
  useEffect(() => {
    emojiSizeRef.current = emojiSize
  }, [emojiSize])

  useEffect(() => {
    animationSpeedRef.current = animationSpeed
  }, [animationSpeed])

  useEffect(() => {
    spawnDirectionRef.current = spawnDirection
  }, [spawnDirection])

  useEffect(() => {
    spawnPositionRef.current = spawnPosition
  }, [spawnPosition])

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
      // For chroma mode, set solid color background
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
      // Reset on unmount
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

  // Get eventId from URL params (defaults to 'default')
  const eventId = searchParams.get('eventId') || 'default'

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Display connected to server')
      setConnected(true)

      // Join the display room for this event
      socket.emit('join-display', {
        displayId: displayId || 'main',
        eventId
      })
    })

    socket.on('disconnect', () => {
      console.log('Display disconnected from server')
      setConnected(false)
    })

    // Listen for emoji reactions to display
    socket.on('reaction:display', (data) => {
      addEmoji(data.emoji, data.isSurge)
    })

    // Listen for settings updates from A/V Tech panel
    socket.on('settings:sync', (settings) => {
      console.log('[Display] Received settings:sync:', settings)
      if (settings.emojiSize) setEmojiSize(settings.emojiSize)
      if (settings.animationSpeed) setAnimationSpeed(settings.animationSpeed)
      if (settings.spawnDirection) setSpawnDirection(settings.spawnDirection)
      if (settings.spawnPosition) setSpawnPosition(settings.spawnPosition)
      if (settings.pollPosition) setPollPosition(settings.pollPosition)
      if (settings.pollSize) setPollSize(settings.pollSize)
      if (settings.qaPosition) setQaPosition(settings.qaPosition)
      if (settings.qaSize) setQaSize(settings.qaSize)
      if (settings.timerPosition) setTimerPosition(settings.timerPosition)
      if (settings.timerSize) setTimerSize(settings.timerSize)
      if (settings.timerStyle) {
        console.log('[Display] Updating timerStyle to:', settings.timerStyle)
        setTimerStyle(settings.timerStyle)
      }
      if (settings.timerColor) {
        console.log('[Display] Updating timerColor to:', settings.timerColor)
        setTimerColor(settings.timerColor)
      }
    })

    // Listen for poll display updates
    socket.on('poll:display', ({ poll }) => {
      setDisplayPoll(poll)
    })

    // Listen for featured question updates
    socket.on('qa:featured', ({ question, position, size }) => {
      setFeaturedQuestion(question)
      // Update Q&A position/size if provided
      if (position) setQaPosition(position)
      if (size) setQaSize(size)
    })

    // Listen for timer display updates (now receives array of timers)
    socket.on('timer:display', ({ timers }) => {
      console.log('[Display] Received timer:display - timers:', timers?.length || 0)
      setDisplayTimers(timers || [])
      // Per-timer settings are now on each timer object, no global update needed
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('reaction:display')
      socket.off('settings:sync')
      socket.off('poll:display')
      socket.off('qa:featured')
      socket.off('timer:display')
    }
  }, [displayId])

  // Get size multiplier based on A/V Tech settings (uses ref for current value)
  const getSizeMultiplier = (size) => {
    switch (size) {
      case 'small': return 0.7
      case 'large': return 1.4
      default: return 1
    }
  }

  // Get duration multiplier based on A/V Tech settings (uses ref for current value)
  const getDurationMultiplier = (speed) => {
    switch (speed) {
      case 'slow': return 1.5
      case 'fast': return 0.6
      default: return 1
    }
  }

  // Get X position based on spawn position setting
  // For left/right, spawn from a tight uniform point near the edge
  const getXPosition = (position) => {
    switch (position) {
      case 'left': return Math.random() * 5 + 2 // 2-7% from left (tight, near edge)
      case 'right': return Math.random() * 5 + 93 // 93-98% from left (tight, near edge)
      default: return Math.random() * 80 + 10 // 10-90% from left (wide)
    }
  }

  // Get horizontal drift for left/right spawn positions
  const getHorizontalDrift = (position) => {
    switch (position) {
      case 'left': return 5 + Math.random() * 10 // Drift right 5-15vw (subtle)
      case 'right': return -(5 + Math.random() * 10) // Drift left 5-15vw (subtle)
      default: return (Math.random() - 0.5) * 6 // Slight random drift for wide
    }
  }

  // Generate particles for surge effect
  const generateParticles = (count = 6) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (360 / count) * i + Math.random() * 30, // Spread evenly with some randomness
      distance: 30 + Math.random() * 40, // How far particles travel
      size: 4 + Math.random() * 4, // Particle size
      delay: Math.random() * 0.2 // Stagger the particle animations
    }))
  }

  // Add emoji with random position and animation
  const addEmoji = (emoji, isSurge = false) => {
    const id = Date.now() + Math.random()
    // Use refs to get current values (avoids stale closure)
    const sizeMultiplier = getSizeMultiplier(emojiSizeRef.current)
    const durationMultiplier = getDurationMultiplier(animationSpeedRef.current)
    const direction = spawnDirectionRef.current
    const position = spawnPositionRef.current

    const baseSize = isSurge ? 60 + Math.random() * 30 : 40 + Math.random() * 20
    const baseDuration = isSurge ? 2 + Math.random() * 1 : 3 + Math.random() * 2

    const newEmoji = {
      id,
      emoji,
      x: getXPosition(position),
      direction,
      horizontalDrift: getHorizontalDrift(position),
      size: baseSize * sizeMultiplier,
      duration: baseDuration * durationMultiplier,
      isSurge,
      particles: isSurge ? generateParticles(8) : []
    }

    setTestEmojis(prev => [...prev, newEmoji])

    // Remove emoji after animation completes
    setTimeout(() => {
      setTestEmojis(prev => prev.filter(e => e.id !== id))
    }, newEmoji.duration * 1000)
  }

  // Test function - add emoji on click
  const handleTestClick = () => {
    const emojis = ['🔥', '❤️', '😂', '👏', '🎉', '👍', '😮', '🚀']
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
    addEmoji(randomEmoji)
  }

  // Determine background style based on mode
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

  // Get size multipliers for poll display
  const getPollSizeMultiplier = (size) => {
    switch (size) {
      case 'small': return 0.75
      case 'large': return 1.25
      default: return 1 // medium
    }
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

  // Get Q&A size multiplier (matches poll sizing)
  const getQASizeMultiplier = (size) => {
    switch (size) {
      case 'small': return 0.75
      case 'large': return 1.25
      default: return 1 // medium
    }
  }

  // Get poll card styles based on position and size
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

  // Get font sizes based on poll size
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

  // Get animation name based on position
  const getPollAnimation = (position) => {
    switch (position) {
      case 'bottom-bar':
      case 'lower-third':
        return 'pollSlideUpCentered' // These use translateX(-50%) for centering
      case 'bottom-right':
      case 'bottom-left':
        return 'pollSlideUp' // Corner positions don't need centering transform
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
      onClick={handleTestClick}
    >
      {/* Connection indicator (only visible when not hideUI) */}
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

      {/* Test mode indicator (only visible when not hideUI) */}
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
          Click anywhere to test emoji | Mode: {mode}
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
                      {/* Result bar (behind text) */}
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

      {/* Featured Q&A Question */}
      {featuredQuestion && (() => {
        const sizeMultiplier = getQASizeMultiplier(qaSize)

        // Get animation based on position (to preserve correct transform)
        const getQAAnimation = (pos) => {
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
              return 'qaSlideInCenter 0.5s ease-out forwards'
          }
        }

        return (
          <div style={{
            ...getQAPositionStyle(qaPosition),
            animation: getQAAnimation(qaPosition)
          }}>
            <div style={{
              background: 'rgba(15, 15, 26, 0.95)',
              borderRadius: Math.round(20 * sizeMultiplier),
              padding: `${Math.round(28 * sizeMultiplier)}px ${Math.round(40 * sizeMultiplier)}px`,
              minWidth: Math.round(450 * sizeMultiplier),
              maxWidth: Math.round(700 * sizeMultiplier),
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              borderLeft: `4px solid #a5b4fc`
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

      {/* Timer overlays (supports up to 3 simultaneous timers) */}
      {displayTimers.map((timer, index) => {
        // Use per-timer settings from timer object
        const timerPosition = timer.position || 'center'
        const timerSize = timer.size || 'medium'
        const timerStyle = timer.style || 'digital'
        const timerColor = timer.color || '#ffffff'
        const displayText = timer.displayText || ''  // Optional custom text

        // Calculate remaining/elapsed time
        const elapsed = timer.currentElapsed || 0
        const remaining = timer.type === 'countdown'
          ? Math.max(0, timer.duration - elapsed)
          : elapsed

        const totalSeconds = Math.floor(remaining / 1000)
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60

        const timeString = hours > 0
          ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

        // Get base position and apply offset for multiple timers
        const basePositionStyle = getPollPositionStyle(timerPosition)
        const sizeMultiplier = getPollSizeMultiplier(timerSize)

        // Offset timers horizontally when multiple are showing at same position
        const getOffsetPosition = (baseStyle, idx, total) => {
          if (total <= 1) return baseStyle
          const spacing = 320 * sizeMultiplier  // pixels between timers
          const startOffset = -((total - 1) * spacing) / 2
          const offset = startOffset + (idx * spacing)

          // Only offset centered positions
          if (baseStyle.left === '50%' && baseStyle.transform?.includes('translateX(-50%)')) {
            return {
              ...baseStyle,
              transform: `translateX(calc(-50% + ${offset}px))`
            }
          }
          return baseStyle
        }

        const positionStyle = getOffsetPosition(basePositionStyle, index, displayTimers.length)

        // Check if countdown is almost done (last 10 seconds)
        const isUrgent = timer.type === 'countdown' && remaining <= 10000 && remaining > 0
        const isFinished = timer.type === 'countdown' && remaining === 0

        // Get animation based on position (to preserve correct transform)
        const getTimerAnimation = (pos) => {
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
        const progress = timer.type === 'countdown'
          ? 1 - (remaining / timer.duration)
          : Math.min(1, elapsed / (60 * 60 * 1000)) // For stopwatch, fill over 1 hour

        // Render based on timerStyle
        if (timerStyle === 'minimal') {
          // Minimal style - just the time, no container
          return (
            <div key={timer.id} style={{
              ...positionStyle,
              animation: getTimerAnimation(timerPosition)
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
                  animation: isUrgent && !isFinished ? 'pollPulse 1s infinite' : 'none'
                }}>
                  {timeString}
                </div>
                {displayText && (
                  <div style={{
                    marginTop: Math.round(12 * sizeMultiplier),
                    fontSize: Math.round(24 * sizeMultiplier),
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 500,
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                  }}>
                    {displayText}
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
            <div key={timer.id} style={{
              ...positionStyle,
              animation: getTimerAnimation(timerPosition)
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
                    animation: isUrgent && !isFinished ? 'pollPulse 1s infinite' : 'none'
                  }}>
                    {timeString}
                  </div>
                  {displayText && (
                    <div style={{
                      marginTop: Math.round(8 * sizeMultiplier),
                      fontSize: Math.round(16 * sizeMultiplier),
                      color: 'rgba(255,255,255,0.7)',
                      fontWeight: 500,
                      maxWidth: '80%',
                      textAlign: 'center'
                    }}>
                      {displayText}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }

        // Default: Digital style (original)
        return (
          <div key={timer.id} style={{
            ...positionStyle,
            animation: getTimerAnimation(timerPosition)
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
                {timer.status === 'running' && !isFinished && (
                  <>
                    <span style={{
                      width: Math.round(10 * sizeMultiplier),
                      height: Math.round(10 * sizeMultiplier),
                      borderRadius: '50%',
                      background: isUrgent ? '#ef4444' : displayColor,
                      animation: 'pollPulse 1.5s infinite'
                    }} />
                    <span style={{
                      color: isUrgent ? '#ef4444' : displayColor,
                      fontSize: Math.round(14 * sizeMultiplier),
                      fontWeight: 600,
                      letterSpacing: '0.05em'
                    }}>
                      {timer.type === 'countdown' ? 'COUNTDOWN' : 'STOPWATCH'}
                    </span>
                  </>
                )}
                {timer.status === 'paused' && (
                  <span style={{
                    color: '#f59e0b',
                    fontSize: Math.round(14 * sizeMultiplier),
                    fontWeight: 600,
                    letterSpacing: '0.05em'
                  }}>
                    PAUSED
                  </span>
                )}
                {isFinished && (
                  <span style={{
                    color: '#ef4444',
                    fontSize: Math.round(14 * sizeMultiplier),
                    fontWeight: 600,
                    letterSpacing: '0.05em'
                  }}>
                    TIME'S UP!
                  </span>
                )}
              </div>

              {/* Timer display */}
              <div style={{
                fontSize: Math.round(96 * sizeMultiplier),
                fontWeight: 700,
                color: displayColor,
                fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace",
                letterSpacing: '0.05em',
                lineHeight: 1,
                animation: isUrgent && !isFinished ? 'pollPulse 1s infinite' : 'none'
              }}>
                {timeString}
              </div>

              {/* Timer custom text (optional) */}
              {displayText && (
                <div style={{
                  marginTop: Math.round(16 * sizeMultiplier),
                  fontSize: Math.round(20 * sizeMultiplier),
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 500
                }}>
                  {displayText}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Emoji layer */}
      {testEmojis.map(({ id, emoji, x, size, duration, isSurge, direction, particles, horizontalDrift }) => (
        <div
          key={id}
          style={{
            position: 'absolute',
            left: `${x}%`,
            ...(direction === 'top-down' ? { top: 0 } : { bottom: 0 }),
            fontSize: size,
            animation: `${isSurge ? (direction === 'top-down' ? 'floatDownSurge' : 'floatUpSurge') : (direction === 'top-down' ? 'floatDown' : 'floatUp')} ${duration}s ease-out forwards`,
            pointerEvents: 'none',
            zIndex: 1000,
            '--horizontal-drift': `${horizontalDrift}vw`
          }}
        >
          {emoji.startsWith('data:') ? (
            <img src={emoji} alt="" style={{ width: size, height: size, objectFit: 'contain' }} />
          ) : emoji}
          {/* Particles for surge effect */}
          {isSurge && particles.map((particle) => (
            <div
              key={particle.id}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: particle.size,
                height: particle.size,
                borderRadius: '50%',
                background: `radial-gradient(circle, rgba(255,215,0,1) 0%, rgba(255,165,0,0.8) 50%, rgba(255,69,0,0) 100%)`,
                boxShadow: '0 0 6px 2px rgba(255,200,0,0.6)',
                animation: `particleBurst ${duration * 0.4}s ease-out ${particle.delay + duration * 0.5}s forwards`,
                opacity: 0,
                transform: 'translate(-50%, -50%)',
                '--particle-angle': `${particle.angle}deg`,
                '--particle-distance': `${particle.distance}px`
              }}
            />
          ))}
        </div>
      ))}

      {/* CSS Animation */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(var(--horizontal-drift, 0)) scale(1.2);
            opacity: 0;
          }
        }
        @keyframes floatUpSurge {
          0% {
            transform: translateY(0) translateX(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          25% {
            transform: translateY(-25vh) translateX(calc(var(--horizontal-drift, 0) * 0.25)) scale(1.3) rotate(-10deg);
          }
          50% {
            transform: translateY(-50vh) translateX(calc(var(--horizontal-drift, 0) * 0.5)) scale(1.5) rotate(10deg);
            opacity: 1;
          }
          75% {
            transform: translateY(-75vh) translateX(calc(var(--horizontal-drift, 0) * 0.75)) scale(1.3) rotate(-5deg);
          }
          100% {
            transform: translateY(-100vh) translateX(var(--horizontal-drift, 0)) scale(1.8) rotate(0deg);
            opacity: 0;
          }
        }
        @keyframes floatDown {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(var(--horizontal-drift, 0)) scale(1.2);
            opacity: 0;
          }
        }
        @keyframes floatDownSurge {
          0% {
            transform: translateY(0) translateX(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          25% {
            transform: translateY(25vh) translateX(calc(var(--horizontal-drift, 0) * 0.25)) scale(1.3) rotate(-10deg);
          }
          50% {
            transform: translateY(50vh) translateX(calc(var(--horizontal-drift, 0) * 0.5)) scale(1.5) rotate(10deg);
            opacity: 1;
          }
          75% {
            transform: translateY(75vh) translateX(calc(var(--horizontal-drift, 0) * 0.75)) scale(1.3) rotate(-5deg);
          }
          100% {
            transform: translateY(100vh) translateX(var(--horizontal-drift, 0)) scale(1.8) rotate(0deg);
            opacity: 0;
          }
        }
        @keyframes particleBurst {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(var(--particle-angle)) translateX(0) scale(1);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--particle-angle)) translateX(var(--particle-distance)) scale(0.3);
          }
        }
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
      `}</style>
    </div>
  )
}

export default Display
