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

  // Poll state
  const [activePoll, setActivePoll] = useState(null)
  const [selectedOption, setSelectedOption] = useState(null)
  const [voteConfirmed, setVoteConfirmed] = useState(false)
  const [pollVisible, setPollVisible] = useState(false)
  const [pollClosing, setPollClosing] = useState(false)

  // Join event room on connect and when eventId changes
  useEffect(() => {
    const handleConnect = () => {
      console.log('Audience connected to server')
      setConnected(true)
      // Join the event room (default to 'default' if no eventId provided)
      socket.emit('join-event', { eventId: eventId || 'default', role: 'audience' })
    }

    const handleDisconnect = () => {
      console.log('Audience disconnected from server')
      setConnected(false)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    // If already connected, join the event room immediately
    if (socket.connected) {
      socket.emit('join-event', { eventId: eventId || 'default', role: 'audience' })
    }

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }, [eventId])

  // Listen for emoji config and cooldown (these don't depend on poll state)
  useEffect(() => {
    socket.on('emoji:config', (data) => {
      if (data.emojis) {
        setEmojis(data.emojis)
      }
    })

    socket.on('reaction:cooldown', () => {
      // Silently ignore - user doesn't see they're rate limited
    })

    return () => {
      socket.off('emoji:config')
      socket.off('reaction:cooldown')
    }
  }, [])

  // Listen for poll events
  useEffect(() => {
    // Listen for active poll
    const handlePollActive = (poll) => {
      console.log('Received poll:active', poll)
      setActivePoll(poll)
      setSelectedOption(null)
      setVoteConfirmed(false)
      setPollClosing(false)
      // Trigger slide-in animation
      setTimeout(() => setPollVisible(true), 50)
    }

    // Listen for poll closed - use functional update to access current state
    const handlePollClosed = ({ pollId }) => {
      console.log('Received poll:closed', pollId)
      setActivePoll(currentPoll => {
        if (currentPoll?.id === pollId) {
          // Trigger slide-out animation
          setPollClosing(true)
          setTimeout(() => {
            setPollVisible(false)
            setTimeout(() => {
              setActivePoll(null)
              setPollClosing(false)
            }, 300)
          }, 50)
        }
        return currentPoll
      })
    }

    // Listen for vote confirmation - use functional update
    const handleVoteConfirmed = ({ pollId, optionId }) => {
      console.log('Received poll:vote-confirmed', pollId, optionId)
      setActivePoll(currentPoll => {
        if (currentPoll?.id === pollId) {
          setSelectedOption(optionId)
          setVoteConfirmed(true)
        }
        return currentPoll
      })
    }

    // Listen for vote error
    const handleVoteError = ({ message }) => {
      console.log('Vote error:', message)
    }

    socket.on('poll:active', handlePollActive)
    socket.on('poll:closed', handlePollClosed)
    socket.on('poll:vote-confirmed', handleVoteConfirmed)
    socket.on('poll:vote-error', handleVoteError)

    return () => {
      socket.off('poll:active', handlePollActive)
      socket.off('poll:closed', handlePollClosed)
      socket.off('poll:vote-confirmed', handleVoteConfirmed)
      socket.off('poll:vote-error', handleVoteError)
    }
  }, [])

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

  const handleVote = (optionId) => {
    if (voteConfirmed && !activePoll?.allowChange) return

    socket.emit('poll:vote', {
      eventId: eventId || 'default',
      pollId: activePoll.id,
      optionId
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

      {/* Poll Section - Above Emoji Grid */}
      {activePoll && (
        <div className={`poll-section ${pollVisible ? 'poll-visible' : ''} ${pollClosing ? 'poll-closing' : ''}`}>
          <div className="poll-card">
            <h2 className="poll-question">{activePoll.question}</h2>

            <div className="poll-options">
              {activePoll.options.map((option, index) => (
                <button
                  key={option.id}
                  className={`poll-option ${selectedOption === option.id ? 'poll-option--selected' : ''}`}
                  onClick={() => handleVote(option.id)}
                  disabled={voteConfirmed && !activePoll.allowChange}
                >
                  <span className="poll-option-letter">{String.fromCharCode(65 + index)}</span>
                  <span className="poll-option-text">{option.text}</span>
                  {selectedOption === option.id && (
                    <span className="poll-option-check">✓</span>
                  )}
                </button>
              ))}
            </div>

            {voteConfirmed && (
              <div className="poll-confirmed">
                Vote submitted!
                {activePoll.allowChange && <span className="poll-change-hint">Tap another option to change</span>}
              </div>
            )}
          </div>
        </div>
      )}

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
