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

  // Settings from A/V Tech panel
  const [emojiSize, setEmojiSize] = useState('medium') // small, medium, large
  const [animationSpeed, setAnimationSpeed] = useState('normal') // slow, normal, fast
  const [spawnDirection, setSpawnDirection] = useState('bottom-up') // bottom-up, top-down
  const [spawnPosition, setSpawnPosition] = useState('wide') // left, right, wide

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
      if (settings.emojiSize) setEmojiSize(settings.emojiSize)
      if (settings.animationSpeed) setAnimationSpeed(settings.animationSpeed)
      if (settings.spawnDirection) setSpawnDirection(settings.spawnDirection)
      if (settings.spawnPosition) setSpawnPosition(settings.spawnPosition)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('reaction:display')
      socket.off('settings:sync')
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
  const getXPosition = (position) => {
    switch (position) {
      case 'left': return Math.random() * 30 + 5 // 5-35% from left
      case 'right': return Math.random() * 30 + 65 // 65-95% from left
      default: return Math.random() * 80 + 10 // 10-90% from left (wide)
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

      {/* Emoji layer */}
      {testEmojis.map(({ id, emoji, x, size, duration, isSurge, direction, particles }) => (
        <div
          key={id}
          style={{
            position: 'absolute',
            left: `${x}%`,
            ...(direction === 'top-down' ? { top: 0 } : { bottom: 0 }),
            fontSize: size,
            animation: `${isSurge ? (direction === 'top-down' ? 'floatDownSurge' : 'floatUpSurge') : (direction === 'top-down' ? 'floatDown' : 'floatUp')} ${duration}s ease-out forwards`,
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          {emoji}
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
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) scale(1.2);
            opacity: 0;
          }
        }
        @keyframes floatUpSurge {
          0% {
            transform: translateY(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          25% {
            transform: translateY(-25vh) scale(1.3) rotate(-10deg);
          }
          50% {
            transform: translateY(-50vh) scale(1.5) rotate(10deg);
            opacity: 1;
          }
          75% {
            transform: translateY(-75vh) scale(1.3) rotate(-5deg);
          }
          100% {
            transform: translateY(-100vh) scale(1.8) rotate(0deg);
            opacity: 0;
          }
        }
        @keyframes floatDown {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) scale(1.2);
            opacity: 0;
          }
        }
        @keyframes floatDownSurge {
          0% {
            transform: translateY(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          25% {
            transform: translateY(25vh) scale(1.3) rotate(-10deg);
          }
          50% {
            transform: translateY(50vh) scale(1.5) rotate(10deg);
            opacity: 1;
          }
          75% {
            transform: translateY(75vh) scale(1.3) rotate(-5deg);
          }
          100% {
            transform: translateY(100vh) scale(1.8) rotate(0deg);
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
      `}</style>
    </div>
  )
}

export default Display
