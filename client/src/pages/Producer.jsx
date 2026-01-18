import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import './Producer.css'

const socket = io('http://localhost:3001')

function Producer() {
  const { eventId = 'default' } = useParams()
  const [connected, setConnected] = useState(false)

  // Polls state
  const [polls, setPolls] = useState([])
  const [pollSectionOpen, setPollSectionOpen] = useState(true)

  // Create poll form
  const [newQuestion, setNewQuestion] = useState('')
  const [newOptions, setNewOptions] = useState(['', ''])
  const [allowChange, setAllowChange] = useState(false)
  const [duration, setDuration] = useState(null)

  // Stats
  const [stats, setStats] = useState({
    totalReactions: 0,
    queueLength: 0,
    activeDisplays: 0
  })

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Producer connected to server')
      setConnected(true)
      socket.emit('join-event', { eventId, role: 'producer' })
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    // Listen for poll sync
    socket.on('poll:sync', (pollsData) => {
      setPolls(pollsData)
    })

    // Listen for poll results updates
    socket.on('poll:results', ({ pollId, results }) => {
      setPolls(prev => prev.map(poll =>
        poll.id === pollId ? { ...poll, results } : poll
      ))
    })

    // Listen for stats updates
    socket.on('stats:update', (data) => {
      setStats(data)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('poll:sync')
      socket.off('poll:results')
      socket.off('stats:update')
    }
  }, [eventId])

  // Add option to poll form
  const addOption = () => {
    if (newOptions.length < 6) {
      setNewOptions([...newOptions, ''])
    }
  }

  // Remove option from poll form
  const removeOption = (index) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== index))
    }
  }

  // Update option text
  const updateOption = (index, value) => {
    const updated = [...newOptions]
    updated[index] = value
    setNewOptions(updated)
  }

  // Create new poll
  const createPoll = () => {
    const trimmedQuestion = newQuestion.trim()
    const trimmedOptions = newOptions.map(o => o.trim()).filter(o => o)

    if (!trimmedQuestion) {
      alert('Please enter a question')
      return
    }

    if (trimmedOptions.length < 2) {
      alert('Please enter at least 2 options')
      return
    }

    socket.emit('poll:create', {
      eventId,
      question: trimmedQuestion,
      options: trimmedOptions,
      allowChange,
      durationSeconds: duration
    })

    // Reset form
    setNewQuestion('')
    setNewOptions(['', ''])
    setAllowChange(false)
    setDuration(null)
  }

  // Delete a poll
  const deletePoll = (pollId) => {
    if (confirm('Are you sure you want to delete this poll?')) {
      socket.emit('poll:delete', { eventId, pollId })
    }
  }

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return '#3b82f6'
      case 'live': return '#22c55e'
      case 'closed': return '#6b7280'
      default: return '#6b7280'
    }
  }

  return (
    <div className="producer-container">
      <header className="producer-header">
        <h1 className="producer-title">Producer Panel</h1>
        <div className="producer-status">
          <span className={`status-indicator ${connected ? 'connected' : ''}`}></span>
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </header>

      <main className="producer-main">
        {/* Stats Section */}
        <section className="producer-section">
          <h2 className="section-title">Live Stats</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalReactions}</div>
              <div className="stat-label">Total Reactions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.queueLength}</div>
              <div className="stat-label">Queue Length</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.activeDisplays}</div>
              <div className="stat-label">Active Displays</div>
            </div>
          </div>
        </section>

        {/* Poll Management - Collapsible */}
        <section className="producer-section">
          <button
            className="section-header-btn"
            onClick={() => setPollSectionOpen(!pollSectionOpen)}
          >
            <h2 className="section-title">Poll Management</h2>
            <span className={`section-chevron ${pollSectionOpen ? 'open' : ''}`}>
              ▼
            </span>
          </button>

          <div className={`collapsible-content ${pollSectionOpen ? 'open' : ''}`}>
            {/* Create New Poll Form */}
            <div className="poll-form">
              <h3 className="form-title">Create New Poll</h3>

              <div className="form-group">
                <label className="form-label">Question</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your poll question..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Options</label>
                {newOptions.map((option, index) => (
                  <div key={index} className="option-row">
                    <input
                      type="text"
                      className="form-input option-input"
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                    />
                    {newOptions.length > 2 && (
                      <button
                        className="option-remove-btn"
                        onClick={() => removeOption(index)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {newOptions.length < 6 && (
                  <button className="add-option-btn" onClick={addOption}>
                    + Add Option
                  </button>
                )}
              </div>

              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={allowChange}
                      onChange={(e) => setAllowChange(e.target.checked)}
                    />
                    Allow vote changes
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <select
                    className="form-select"
                    value={duration || ''}
                    onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">No limit</option>
                    <option value="30">30 seconds</option>
                    <option value="60">1 minute</option>
                    <option value="120">2 minutes</option>
                    <option value="300">5 minutes</option>
                  </select>
                </div>
              </div>

              <button className="create-poll-btn" onClick={createPoll}>
                Create Poll
              </button>
            </div>

            {/* Existing Polls List */}
            <div className="polls-list">
              <h3 className="form-title">Created Polls</h3>

              {polls.length === 0 ? (
                <p className="no-polls-message">No polls created yet</p>
              ) : (
                polls.map(poll => (
                  <div key={poll.id} className="poll-card">
                    <div className="poll-card-header">
                      <span
                        className="poll-status-badge"
                        style={{ backgroundColor: getStatusColor(poll.status) }}
                      >
                        {poll.status.toUpperCase()}
                      </span>
                      <span className="poll-question">{poll.question}</span>
                    </div>

                    <div className="poll-options-preview">
                      {poll.options.map((opt, idx) => {
                        const votes = poll.results?.voteCounts?.[opt.id] || 0
                        const total = poll.results?.totalVotes || 0
                        const percentage = total > 0 ? Math.round((votes / total) * 100) : 0

                        return (
                          <div key={opt.id} className="poll-option-row">
                            <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                            <span className="option-text">{opt.text}</span>
                            {poll.status !== 'ready' && (
                              <span className="option-votes">{votes} ({percentage}%)</span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {poll.status !== 'ready' && (
                      <div className="poll-total-votes">
                        Total votes: {poll.results?.totalVotes || 0}
                      </div>
                    )}

                    {poll.status === 'ready' && (
                      <div className="poll-actions">
                        <button
                          className="poll-action-btn delete"
                          onClick={() => deletePoll(poll.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Display URLs */}
        <section className="producer-section">
          <h2 className="section-title">Quick Links</h2>
          <div className="url-list">
            <div className="url-item">
              <span className="url-label">A/V Tech Panel:</span>
              <code className="url-code">
                {window.location.origin}/avtech/{eventId}
              </code>
            </div>
            <div className="url-item">
              <span className="url-label">Audience Page:</span>
              <code className="url-code">
                {window.location.origin}/audience/{eventId}
              </code>
            </div>
            <div className="url-item">
              <span className="url-label">Display Output:</span>
              <code className="url-code">
                {window.location.origin}/display?eventId={eventId}
              </code>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Producer
