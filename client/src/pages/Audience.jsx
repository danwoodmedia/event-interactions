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
  const [selectedOptions, setSelectedOptions] = useState(new Set())
  const [voteConfirmed, setVoteConfirmed] = useState(false)
  const [pollVisible, setPollVisible] = useState(false)
  const [pollClosing, setPollClosing] = useState(false)

  // Q&A state
  const [qaEnabled, setQaEnabled] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [questionSubmitted, setQuestionSubmitted] = useState(false)
  const [showQaForm, setShowQaForm] = useState(false)

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

    // Listen for emoji list updates from server
    socket.on('emoji:list', (emojiList) => {
      if (emojiList && emojiList.length > 0) {
        setEmojis(emojiList)
      }
    })

    socket.on('reaction:cooldown', () => {
      // Silently ignore - user doesn't see they're rate limited
    })

    return () => {
      socket.off('emoji:config')
      socket.off('emoji:list')
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
      setSelectedOptions(new Set())
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
    const handleVoteConfirmed = ({ pollId, optionId, optionIds }) => {
      console.log('Received poll:vote-confirmed', pollId, optionId, optionIds)
      setActivePoll(currentPoll => {
        if (currentPoll?.id === pollId) {
          if (optionIds) {
            // Multi-select confirmation
            setSelectedOptions(new Set(optionIds))
          } else {
            // Single select confirmation
            setSelectedOption(optionId)
          }
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

  // Listen for Q&A events
  useEffect(() => {
    // Listen for Q&A state
    socket.on('qa:state', ({ enabled }) => {
      setQaEnabled(enabled)
      // If Q&A was just disabled, hide the form
      if (!enabled) {
        setShowQaForm(false)
      }
    })

    // Listen for question submitted confirmation
    socket.on('qa:submitted', () => {
      setQuestionSubmitted(true)
      setQuestionText('')
      // Reset after a few seconds
      setTimeout(() => {
        setQuestionSubmitted(false)
      }, 3000)
    })

    // Listen for Q&A error
    socket.on('qa:error', ({ message }) => {
      console.log('Q&A error:', message)
      alert(message)
    })

    return () => {
      socket.off('qa:state')
      socket.off('qa:submitted')
      socket.off('qa:error')
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
    if (activePoll?.allowMultiple) {
      // Multi-select: toggle the option
      const newSelections = new Set(selectedOptions)
      if (newSelections.has(optionId)) {
        newSelections.delete(optionId)
      } else {
        newSelections.add(optionId)
      }
      setSelectedOptions(newSelections)

      // Send all selections to server
      socket.emit('poll:vote', {
        eventId: eventId || 'default',
        pollId: activePoll.id,
        optionIds: [...newSelections]
      })
    } else {
      // Single select
      if (voteConfirmed && !activePoll?.allowChange) return

      setSelectedOption(optionId)
      socket.emit('poll:vote', {
        eventId: eventId || 'default',
        pollId: activePoll.id,
        optionId
      })
    }
  }

  const handleSubmitQuestion = () => {
    const text = questionText.trim()
    if (!text) {
      return
    }

    socket.emit('qa:submit', {
      eventId: eventId || 'default',
      text,
      authorName: authorName.trim() || 'Anonymous'
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

            {activePoll.allowMultiple && (
              <p className="poll-multi-hint">Select all that apply</p>
            )}

            <div className="poll-options">
              {activePoll.options.map((option, index) => {
                const isSelected = activePoll.allowMultiple
                  ? selectedOptions.has(option.id)
                  : selectedOption === option.id

                return (
                  <button
                    key={option.id}
                    className={`poll-option ${isSelected ? 'poll-option--selected' : ''}`}
                    onClick={() => handleVote(option.id)}
                    disabled={!activePoll.allowMultiple && voteConfirmed && !activePoll.allowChange}
                  >
                    <span className="poll-option-letter">{String.fromCharCode(65 + index)}</span>
                    <span className="poll-option-text">{option.text}</span>
                    {isSelected && (
                      <span className="poll-option-check">✓</span>
                    )}
                  </button>
                )
              })}
            </div>

            {voteConfirmed && !activePoll.allowMultiple && (
              <div className="poll-confirmed">
                Vote submitted!
                {activePoll.allowChange && <span className="poll-change-hint">Tap another option to change</span>}
              </div>
            )}

            {activePoll.allowMultiple && selectedOptions.size > 0 && (
              <div className="poll-confirmed">
                {selectedOptions.size} option{selectedOptions.size !== 1 ? 's' : ''} selected
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
              {emoji.startsWith('data:') ? (
                <img src={emoji} alt="custom emoji" className="emoji-icon emoji-img" />
              ) : (
                <span className="emoji-icon">{emoji}</span>
              )}
            </button>
          ))}
        </div>
      </main>

      {/* Q&A Section */}
      {qaEnabled && (
        <div className="qa-section">
          {!showQaForm ? (
            <button
              className="qa-open-btn"
              onClick={() => setShowQaForm(true)}
            >
              <span className="qa-open-icon">💬</span>
              Ask a Question
            </button>
          ) : (
            <div className="qa-form-container">
              <div className="qa-form-header">
                <h3 className="qa-form-title">Ask a Question</h3>
                <button
                  className="qa-close-btn"
                  onClick={() => setShowQaForm(false)}
                >
                  ×
                </button>
              </div>

              {questionSubmitted ? (
                <div className="qa-submitted-message">
                  <span className="qa-submitted-icon">✓</span>
                  Question submitted! It will appear after moderation.
                </div>
              ) : (
                <>
                  <textarea
                    className="qa-textarea"
                    placeholder="Type your question here..."
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <input
                    type="text"
                    className="qa-name-input"
                    placeholder="Your name (optional)"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    maxLength={50}
                  />
                  <button
                    className="qa-submit-btn"
                    onClick={handleSubmitQuestion}
                    disabled={!questionText.trim()}
                  >
                    Submit Question
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

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
