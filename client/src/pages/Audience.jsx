import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import './Audience.css'

const socket = io('http://localhost:3001')

// Default emoji set - can be customized per event
const DEFAULT_EMOJIS = ['🔥', '❤️', '😂', '👏', '🎉', '👍', '😮', '🚀', '💯', '🙌', '😍', '🤩']

function Audience() {
  const { eventId } = useParams()
  const [connected, setConnected] = useState(false)
  const [emojis, setEmojis] = useState(DEFAULT_EMOJIS)
  const [lastTap, setLastTap] = useState(null)

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Audience connected to server')
      setConnected(true)

      // Join the event room
      if (eventId) {
        socket.emit('join-event', { eventId, role: 'audience' })
      }
    })

    socket.on('disconnect', () => {
      console.log('Audience disconnected from server')
      setConnected(false)
    })

    // Listen for emoji config updates from server
    socket.on('emoji:config', (data) => {
      if (data.emojis) {
        setEmojis(data.emojis)
      }
    })

    // Listen for cooldown feedback (invisible rate limiting)
    socket.on('reaction:cooldown', () => {
      // Silently ignore - user doesn't see they're rate limited
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('emoji:config')
      socket.off('reaction:cooldown')
    }
  }, [eventId])

  const handleEmojiTap = (emoji) => {
    // Visual feedback
    setLastTap(emoji)
    setTimeout(() => setLastTap(null), 150)

    // Send to server
    socket.emit('reaction:send', {
      emoji,
      eventId: eventId || 'default',
      timestamp: Date.now()
    })
  }

  return (
    <div className="audience-container">
      {/* Header */}
      <header className="audience-header">
        <h1 className="audience-title">React!</h1>
        <p className="audience-subtitle">Tap an emoji to send it to the screen</p>
        {!connected && (
          <div className="audience-disconnected">Connecting...</div>
        )}
      </header>

      {/* Emoji Grid */}
      <main className="audience-main">
        <div className="emoji-grid">
          {emojis.map((emoji, index) => (
            <button
              key={index}
              className={`emoji-button ${lastTap === emoji ? 'emoji-button--active' : ''}`}
              onClick={() => handleEmojiTap(emoji)}
            >
              <span className="emoji-icon">{emoji}</span>
            </button>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="audience-footer">
        <p className="footer-text">
          {connected ? 'Connected' : 'Reconnecting...'}
          <span className={`status-dot ${connected ? 'status-dot--connected' : ''}`}></span>
        </p>
      </footer>
    </div>
  )
}

export default Audience
