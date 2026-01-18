import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import './AVTech.css'

const socket = io('http://localhost:3001')

const DEFAULT_EMOJIS = ['🔥', '❤️', '😂', '👏', '🎉', '👍', '😮', '🚀', '💯', '🙌', '😍', '🤩']

function AVTech() {
  const { eventId = 'default' } = useParams()
  const [connected, setConnected] = useState(false)

  // Emoji settings
  const [emojisEnabled, setEmojisEnabled] = useState(true)
  const [maxOnScreen, setMaxOnScreen] = useState(30)
  const [emojiSize, setEmojiSize] = useState('medium') // small, medium, large
  const [animationSpeed, setAnimationSpeed] = useState('normal') // slow, normal, fast
  const [spawnDirection, setSpawnDirection] = useState('bottom-up') // bottom-up, top-down
  const [spawnPosition, setSpawnPosition] = useState('wide') // left, right, wide

  // UI state
  const [emojiSettingsOpen, setEmojiSettingsOpen] = useState(false)
  const [pollControlOpen, setPollControlOpen] = useState(true)

  // Polls state
  const [polls, setPolls] = useState([])

  // Stats
  const [stats, setStats] = useState({
    totalReactions: 0,
    queueLength: 0,
    activeDisplays: 0
  })

  useEffect(() => {
    socket.on('connect', () => {
      console.log('A/V Tech connected to server')
      setConnected(true)
      socket.emit('join-event', { eventId, role: 'avtech' })
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    // Listen for stats updates
    socket.on('stats:update', (data) => {
      setStats(data)
    })

    // Listen for settings sync
    socket.on('settings:sync', (data) => {
      if (data.emojisEnabled !== undefined) setEmojisEnabled(data.emojisEnabled)
      if (data.maxOnScreen !== undefined) setMaxOnScreen(data.maxOnScreen)
      if (data.emojiSize !== undefined) setEmojiSize(data.emojiSize)
      if (data.animationSpeed !== undefined) setAnimationSpeed(data.animationSpeed)
      if (data.spawnDirection !== undefined) setSpawnDirection(data.spawnDirection)
      if (data.spawnPosition !== undefined) setSpawnPosition(data.spawnPosition)
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

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('stats:update')
      socket.off('settings:sync')
      socket.off('poll:sync')
      socket.off('poll:results')
    }
  }, [eventId])

  // Send settings to server when changed
  const updateSetting = (key, value) => {
    socket.emit('settings:update', {
      eventId,
      [key]: value
    })
  }

  const handleEmojisEnabledChange = (enabled) => {
    setEmojisEnabled(enabled)
    updateSetting('emojisEnabled', enabled)
  }

  const handleMaxOnScreenChange = (value) => {
    setMaxOnScreen(value)
    updateSetting('maxOnScreen', value)
  }

  const handleEmojiSizeChange = (size) => {
    setEmojiSize(size)
    updateSetting('emojiSize', size)
  }

  const handleAnimationSpeedChange = (speed) => {
    setAnimationSpeed(speed)
    updateSetting('animationSpeed', speed)
  }

  const handleSpawnDirectionChange = (direction) => {
    setSpawnDirection(direction)
    updateSetting('spawnDirection', direction)
  }

  const handleSpawnPositionChange = (position) => {
    setSpawnPosition(position)
    updateSetting('spawnPosition', position)
  }

  const clearQueue = () => {
    socket.emit('queue:clear', { eventId })
  }

  const testEmoji = () => {
    const randomEmoji = DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)]
    socket.emit('reaction:test', { eventId, emoji: randomEmoji })
  }

  const testSurge = () => {
    const randomEmoji = DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)]
    // Send the same emoji directly as a surge (bypasses queue)
    socket.emit('reaction:test-surge', { eventId, emoji: randomEmoji })
  }

  // Poll control functions
  const sendPollToDisplay = (pollId) => {
    socket.emit('poll:send-to-display', { eventId, pollId })
  }

  const toggleShowResults = (pollId, currentShow) => {
    socket.emit('poll:show-results', { eventId, pollId, show: !currentShow })
  }

  const closePoll = (pollId) => {
    socket.emit('poll:close', { eventId, pollId })
  }

  const hidePollFromDisplay = (pollId) => {
    socket.emit('poll:hide', { eventId, pollId })
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
    <div className="avtech-container">
      <header className="avtech-header">
        <h1 className="avtech-title">A/V Tech Panel</h1>
        <div className="avtech-status">
          <span className={`status-indicator ${connected ? 'connected' : ''}`}></span>
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </header>

      <main className="avtech-main">
        {/* Stats Section */}
        <section className="avtech-section">
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

        {/* Quick Actions */}
        <section className="avtech-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-row">
            <button
              className={`action-btn ${emojisEnabled ? 'enabled' : 'disabled'}`}
              onClick={() => handleEmojisEnabledChange(!emojisEnabled)}
            >
              {emojisEnabled ? '⏸️ Pause Emojis' : '▶️ Resume Emojis'}
            </button>
            <button className="action-btn secondary" onClick={clearQueue}>
              🗑️ Clear Queue
            </button>
            <button className="action-btn secondary" onClick={testEmoji}>
              🧪 Test Emoji
            </button>
            <button className="action-btn secondary" onClick={testSurge}>
              🔥 Test Surge
            </button>
          </div>
        </section>

        {/* Emoji Settings - Collapsible */}
        <section className="avtech-section">
          <button
            className="section-header-btn"
            onClick={() => setEmojiSettingsOpen(!emojiSettingsOpen)}
          >
            <h2 className="section-title">Emoji Settings</h2>
            <span className={`section-chevron ${emojiSettingsOpen ? 'open' : ''}`}>
              ▼
            </span>
          </button>

          <div className={`collapsible-content ${emojiSettingsOpen ? 'open' : ''}`}>
            <div className="setting-row">
              <label className="setting-label">Max Emojis on Screen</label>
              <div className="setting-control">
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={maxOnScreen}
                  onChange={(e) => handleMaxOnScreenChange(Number(e.target.value))}
                  className="range-input"
                />
                <span className="range-value">{maxOnScreen}</span>
              </div>
            </div>

            <div className="setting-row">
              <label className="setting-label">Emoji Size</label>
              <div className="setting-control button-group">
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    key={size}
                    className={`size-btn ${emojiSize === size ? 'active' : ''}`}
                    onClick={() => handleEmojiSizeChange(size)}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-row">
              <label className="setting-label">Animation Speed</label>
              <div className="setting-control button-group">
                {['slow', 'normal', 'fast'].map((speed) => (
                  <button
                    key={speed}
                    className={`size-btn ${animationSpeed === speed ? 'active' : ''}`}
                    onClick={() => handleAnimationSpeedChange(speed)}
                  >
                    {speed.charAt(0).toUpperCase() + speed.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-row">
              <label className="setting-label">Spawn Direction</label>
              <div className="setting-control button-group">
                {[
                  { value: 'bottom-up', label: '⬆️ Bottom Up' },
                  { value: 'top-down', label: '⬇️ Top Down' }
                ].map((option) => (
                  <button
                    key={option.value}
                    className={`size-btn ${spawnDirection === option.value ? 'active' : ''}`}
                    onClick={() => handleSpawnDirectionChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-row">
              <label className="setting-label">Spawn Position</label>
              <div className="setting-control button-group">
                {[
                  { value: 'left', label: '◀️ Left' },
                  { value: 'wide', label: '↔️ Wide' },
                  { value: 'right', label: '▶️ Right' }
                ].map((option) => (
                  <button
                    key={option.value}
                    className={`size-btn ${spawnPosition === option.value ? 'active' : ''}`}
                    onClick={() => handleSpawnPositionChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Poll Control - Collapsible */}
        <section className="avtech-section">
          <button
            className="section-header-btn"
            onClick={() => setPollControlOpen(!pollControlOpen)}
          >
            <h2 className="section-title">Poll Control</h2>
            <span className={`section-chevron ${pollControlOpen ? 'open' : ''}`}>
              ▼
            </span>
          </button>

          <div className={`collapsible-content ${pollControlOpen ? 'open' : ''}`}>
            {polls.length === 0 ? (
              <p className="no-polls-message">No polls available. Create polls in the Producer panel.</p>
            ) : (
              <div className="poll-control-list">
                {polls.map(poll => (
                  <div key={poll.id} className="poll-control-card">
                    <div className="poll-control-header">
                      <span
                        className="poll-status-badge"
                        style={{ backgroundColor: getStatusColor(poll.status) }}
                      >
                        {poll.status.toUpperCase()}
                      </span>
                      <span className="poll-question-preview">{poll.question}</span>
                    </div>

                    {/* Show vote count for live/closed polls */}
                    {poll.status !== 'ready' && (
                      <div className="poll-vote-count">
                        {poll.results?.totalVotes || 0} votes
                        {poll.showOnDisplay && <span className="on-display-badge">ON DISPLAY</span>}
                      </div>
                    )}

                    <div className="poll-control-actions">
                      {poll.status === 'ready' && (
                        <button
                          className="poll-ctrl-btn primary"
                          onClick={() => sendPollToDisplay(poll.id)}
                        >
                          📺 Send to Display
                        </button>
                      )}

                      {poll.status === 'live' && (
                        <>
                          <button
                            className={`poll-ctrl-btn ${poll.showResults ? 'active' : 'secondary'}`}
                            onClick={() => toggleShowResults(poll.id, poll.showResults)}
                          >
                            {poll.showResults ? '📊 Hide Results' : '📊 Show Results'}
                          </button>
                          <button
                            className="poll-ctrl-btn warning"
                            onClick={() => closePoll(poll.id)}
                          >
                            ⏹️ Close Voting
                          </button>
                        </>
                      )}

                      {poll.status === 'closed' && (
                        <>
                          <button
                            className={`poll-ctrl-btn ${poll.showResults ? 'active' : 'secondary'}`}
                            onClick={() => toggleShowResults(poll.id, poll.showResults)}
                          >
                            {poll.showResults ? '📊 Hide Results' : '📊 Show Results'}
                          </button>
                        </>
                      )}

                      {poll.showOnDisplay && (
                        <button
                          className="poll-ctrl-btn danger"
                          onClick={() => hidePollFromDisplay(poll.id)}
                        >
                          🚫 Hide from Display
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Display URLs */}
        <section className="avtech-section">
          <h2 className="section-title">Display URLs</h2>
          <div className="url-list">
            <div className="url-item">
              <span className="url-label">Transparent (OBS/vMix):</span>
              <code className="url-code">
                {window.location.origin}/display?eventId={eventId}
              </code>
            </div>
            <div className="url-item">
              <span className="url-label">Chroma Key (Green):</span>
              <code className="url-code">
                {window.location.origin}/display?eventId={eventId}&mode=chroma
              </code>
            </div>
            <div className="url-item">
              <span className="url-label">Audience Page:</span>
              <code className="url-code">
                {window.location.origin}/audience/{eventId}
              </code>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default AVTech
