import { useState, useEffect } from 'react'
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

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Display connected to server')
      setConnected(true)

      // Join the display room
      if (displayId) {
        socket.emit('join-display', { displayId })
      }
    })

    socket.on('disconnect', () => {
      console.log('Display disconnected from server')
      setConnected(false)
    })

    // Listen for emoji reactions to display
    socket.on('reaction:display', (data) => {
      addEmoji(data.emoji)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('reaction:display')
    }
  }, [displayId])

  // Add emoji with random position and animation
  const addEmoji = (emoji) => {
    const id = Date.now() + Math.random()
    const newEmoji = {
      id,
      emoji,
      x: Math.random() * 80 + 10, // 10-90% from left
      startY: 100, // Start from bottom
      size: 40 + Math.random() * 20, // 40-60px
      duration: 3 + Math.random() * 2, // 3-5 seconds
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
      {testEmojis.map(({ id, emoji, x, size, duration }) => (
        <div
          key={id}
          style={{
            position: 'absolute',
            left: `${x}%`,
            bottom: 0,
            fontSize: size,
            animation: `floatUp ${duration}s ease-out forwards`,
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          {emoji}
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
      `}</style>
    </div>
  )
}

export default Display
