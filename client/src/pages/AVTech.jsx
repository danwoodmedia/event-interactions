import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import './AVTech.css'

const DEFAULT_EMOJIS = ['🔥', '❤️', '😂', '👏', '🎉', '👍', '😮', '🚀', '💯', '🙌', '😍', '🤩']

const POLL_POSITIONS = [
  { value: 'center', label: 'Center' },
  { value: 'lower-third', label: 'Lower Third' },
  { value: 'bottom-bar', label: 'Bottom Bar' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' }
]

const POLL_SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' }
]

const TIMER_POSITIONS = [
  { value: 'center', label: 'Center' },
  { value: 'lower-third', label: 'Lower Third' },
  { value: 'bottom-bar', label: 'Bottom Bar' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' }
]

const TIMER_SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' }
]

const TIMER_STYLES = [
  { value: 'digital', label: 'Digital' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'circular', label: 'Circular' }
]

const TIMER_COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#ef4444', label: 'Red' },
  { value: '#a855f7', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' }
]

const QA_POSITIONS = [
  { value: 'center', label: 'Center' },
  { value: 'lower-third', label: 'Lower Third' },
  { value: 'bottom-bar', label: 'Bottom Bar' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' }
]

const QA_SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' }
]

const TEST_POLL_QUESTIONS = [
  { question: "What's your favorite color?", options: ["Red", "Blue", "Green", "Yellow"] },
  { question: "How's the event so far?", options: ["Amazing!", "Pretty good", "It's okay", "Needs improvement"] },
  { question: "Best programming language?", options: ["JavaScript", "Python", "TypeScript", "Rust"] },
  { question: "Coffee or Tea?", options: ["Coffee", "Tea", "Both", "Neither"] },
  { question: "Favorite season?", options: ["Spring", "Summer", "Fall", "Winter"] },
  { question: "Morning or Night person?", options: ["Early Bird", "Night Owl", "Depends on the day"] }
]

function AVTech() {
  const { eventId = 'default' } = useParams()
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)

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
  const [showArchived, setShowArchived] = useState(false)
  const [activeDisplayTab, setActiveDisplayTab] = useState('mixed')
  const [showDisplayLinks, setShowDisplayLinks] = useState({ mixed: false, emojis: false, polls: false, timers: false, qa: false })

  // Polls state
  const [polls, setPolls] = useState([])
  const [pollPosition, setPollPosition] = useState('center')
  const [pollSize, setPollSize] = useState('medium')

  // Bundles state
  const [bundles, setBundles] = useState([])
  const [expandedBundles, setExpandedBundles] = useState(new Set())

  // Q&A state
  const [qaSectionOpen, setQaSectionOpen] = useState(true)
  const [qaEnabled, setQaEnabled] = useState(false)
  const [questions, setQuestions] = useState([])
  const [qaFilter, setQaFilter] = useState('pending')

  // Timer state
  const [timerControlOpen, setTimerControlOpen] = useState(true)
  const [timers, setTimers] = useState([])

  // Q&A position/size
  const [qaPosition, setQaPosition] = useState('lower-third')
  const [qaSize, setQaSize] = useState('medium')

  // Stats
  const [stats, setStats] = useState({
    totalReactions: 0,
    queueLength: 0,
    activeDisplays: 0
  })

  useEffect(() => {
    // Initialize socket connection (password authentication handled by gate)
    const socket = io('http://localhost:3001', {
      auth: {
        role: 'avtech'
      }
    })

    socketRef.current = socket

    // IMPORTANT: Set up all event listeners BEFORE the connect event
    // This ensures listeners are ready when server broadcasts data after join-event

    // Listen for stats updates
    socket.on('stats:update', (data) => {
      setStats(data)
    })

    // Listen for settings sync (timer settings are now per-timer, not global)
    socket.on('settings:sync', (data) => {
      if (data.emojisEnabled !== undefined) setEmojisEnabled(data.emojisEnabled)
      if (data.maxOnScreen !== undefined) setMaxOnScreen(data.maxOnScreen)
      if (data.emojiSize !== undefined) setEmojiSize(data.emojiSize)
      if (data.animationSpeed !== undefined) setAnimationSpeed(data.animationSpeed)
      if (data.spawnDirection !== undefined) setSpawnDirection(data.spawnDirection)
      if (data.spawnPosition !== undefined) setSpawnPosition(data.spawnPosition)
      if (data.pollPosition !== undefined) setPollPosition(data.pollPosition)
      if (data.pollSize !== undefined) setPollSize(data.pollSize)
      if (data.qaPosition !== undefined) setQaPosition(data.qaPosition)
      if (data.qaSize !== undefined) setQaSize(data.qaSize)
    })

    // Listen for poll sync
    socket.on('poll:sync', (pollsData) => {
      console.log('[AVTech] Received poll:sync event:', pollsData)
      console.log('[AVTech] Number of polls:', pollsData?.length)
      setPolls(pollsData)
    })

    // Listen for poll results updates
    socket.on('poll:results', ({ pollId, results }) => {
      setPolls(prev => prev.map(poll =>
        poll.id === pollId ? { ...poll, results } : poll
      ))
    })

    // Listen for bundle sync
    socket.on('bundle:sync', (bundlesData) => {
      setBundles(bundlesData)
    })

    // Listen for Q&A sync
    socket.on('qa:sync', ({ enabled, questions: questionsList }) => {
      setQaEnabled(enabled)
      setQuestions(questionsList)
    })

    // Listen for timer sync
    socket.on('timer:sync', (timersData) => {
      console.log('[AVTech] Received timer:sync event:', timersData)
      setTimers(timersData)
    })

    // Listen for timer tick updates (live countdown)
    socket.on('timer:tick', (tickData) => {
      setTimers(prev => prev.map(timer =>
        timer.id === tickData.timerId
          ? { ...timer, currentElapsed: tickData.elapsed }
          : timer
      ))
    })

    socket.on('connect', () => {
      console.log('[AVTech] ✓ Socket connected to server')
      console.log('[AVTech] Socket ID:', socket.id)
      console.log('[AVTech] Emitting join-event with:', { eventId, role: 'avtech' })
      setConnected(true)
      socket.emit('join-event', { eventId, role: 'avtech' })
    })

    socket.on('disconnect', () => {
      console.log('[AVTech] ✗ Socket disconnected')
      setConnected(false)
    })

    socket.on('connect_error', (err) => {
      console.error('[AVTech] Socket connection error:', err.message)
    })

    socket.on('error', (error) => {
      console.error('[AVTech] Socket error:', error)
    })

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.off('timer:tick')
        socket.disconnect()
      }
    }
  }, [eventId])

  // Note: All setting handlers use inline handlers in JSX to ensure socketRef.current is correctly referenced

  const clearQueue = () => {
    socketRef.current?.emit('queue:clear', { eventId })
  }

  const testEmoji = () => {
    const randomEmoji = DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)]
    socketRef.current?.emit('reaction:test', { eventId, emoji: randomEmoji })
  }

  const testSurge = () => {
    const randomEmoji = DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)]
    // Send the same emoji directly as a surge (bypasses queue)
    socketRef.current?.emit('reaction:test-surge', { eventId, emoji: randomEmoji })
  }

  // Poll control functions
  const sendPollToDisplay = (pollId) => {
    console.log(`[AVTech] Sending poll to display:`, pollId)
    console.log(`[AVTech] Socket connected:`, socketRef.current?.connected)
    socketRef.current?.emit('poll:send-to-display', { eventId, pollId })
  }

  const toggleShowResults = (pollId, currentShow) => {
    socketRef.current?.emit('poll:show-results', { eventId, pollId, show: !currentShow })
  }

  const closePoll = (pollId) => {
    socketRef.current?.emit('poll:close', { eventId, pollId })
  }

  const hidePollFromDisplay = (pollId) => {
    socketRef.current?.emit('poll:hide', { eventId, pollId })
  }

  const resetPoll = (pollId) => {
    socketRef.current?.emit('poll:reset', { eventId, pollId })
  }

  const generateTestPoll = () => {
    const test = TEST_POLL_QUESTIONS[Math.floor(Math.random() * TEST_POLL_QUESTIONS.length)]
    socketRef.current?.emit('poll:create', {
      eventId,
      question: `[TEST] ${test.question}`,
      options: test.options,
      allowChange: true,
      durationSeconds: null
    })
  }

  // Note: Poll position/size handlers removed in favor of inline handlers in JSX

  // Bundle control functions
  const startBundle = (bundleId) => {
    socketRef.current?.emit('bundle:start', { eventId, bundleId })
  }

  const advanceBundle = (bundleId) => {
    socketRef.current?.emit('bundle:next', { eventId, bundleId })
  }

  const toggleBundleExpanded = (bundleId) => {
    setExpandedBundles(prev => {
      const next = new Set(prev)
      if (next.has(bundleId)) {
        next.delete(bundleId)
      } else {
        next.add(bundleId)
      }
      return next
    })
  }

  // ============================================
  // Q&A Functions
  // ============================================

  const toggleQA = (enabled) => {
    socketRef.current?.emit('qa:toggle', { eventId, enabled })
  }

  const approveQuestion = (questionId) => {
    socketRef.current?.emit('qa:approve', { eventId, questionId })
  }

  const rejectQuestion = (questionId) => {
    socketRef.current?.emit('qa:reject', { eventId, questionId })
  }

  const featureQuestion = (questionId) => {
    socketRef.current?.emit('qa:feature', { eventId, questionId })
  }

  const unfeatureQuestion = (questionId) => {
    socketRef.current?.emit('qa:unfeature', { eventId, questionId })
  }

  const deleteQuestion = (questionId) => {
    socketRef.current?.emit('qa:delete', { eventId, questionId })
  }

  const getFilteredQuestions = () => {
    if (qaFilter === 'all') return questions
    return questions.filter(q => q.status === qaFilter)
  }

  const getQuestionCounts = () => {
    return {
      pending: questions.filter(q => q.status === 'pending').length,
      approved: questions.filter(q => q.status === 'approved').length,
      featured: questions.filter(q => q.status === 'featured').length,
      rejected: questions.filter(q => q.status === 'rejected').length,
      total: questions.length
    }
  }

  // Filter polls - exclude bundled polls from individual list
  const activePolls = polls.filter(p => p.status !== 'closed' && !p.bundleId)
  const archivedPolls = polls.filter(p => p.status === 'closed' && !p.bundleId)

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return '#3b82f6'
      case 'live': return '#22c55e'
      case 'running': return '#22c55e'
      case 'paused': return '#f59e0b'
      case 'finished': return '#6b7280'
      case 'closed': return '#6b7280'
      default: return '#6b7280'
    }
  }

  // Timer functions
  const sendTimerToDisplay = (timerId) => {
    socketRef.current?.emit('timer:send-to-display', { eventId, timerId })
  }

  const hideTimerFromDisplay = (timerId) => {
    socketRef.current?.emit('timer:hide', { eventId, timerId })
  }

  // Format timer display
  const formatTimerDisplay = (timer) => {
    let ms = 0
    if (timer.type === 'countdown') {
      ms = Math.max(0, timer.duration - (timer.currentElapsed || 0))
    } else {
      ms = timer.currentElapsed || 0
    }

    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }


  return (
    <div className="avtech-container">
      <header className="avtech-header">
        <div className="avtech-header-left">
          <h1 className="avtech-title">A/V Tech Panel</h1>
          <div className="avtech-status">
            <span className={`status-indicator ${connected ? 'connected' : ''}`}></span>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
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
              onClick={() => {
                const newValue = !emojisEnabled
                console.log(`[AVTech] Emojis enabled toggled to:`, newValue)
                if (socketRef.current) {
                  socketRef.current.emit('settings:update', { eventId, emojisEnabled: newValue })
                  setEmojisEnabled(newValue)
                  console.log(`[AVTech] Emitted emojisEnabled:`, newValue)
                }
              }}
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
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    console.log(`[AVTech] Max on screen changed to:`, value)
                    if (socketRef.current) {
                      socketRef.current.emit('settings:update', { eventId, maxOnScreen: value })
                      setMaxOnScreen(value)
                    }
                  }}
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
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log(`[AVTech] Size button ${size} clicked directly!`)
                      console.log(`[AVTech] socketRef:`, socketRef)
                      console.log(`[AVTech] socketRef.current:`, socketRef.current)
                      if (socketRef.current) {
                        console.log(`[AVTech] Socket exists, emitting...`)
                        socketRef.current.emit('settings:update', { eventId, emojiSize: size })
                        setEmojiSize(size)
                        console.log(`[AVTech] Emitted and state updated`)
                      } else {
                        console.error(`[AVTech] Socket is null!`)
                      }
                    }}
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
                    onClick={(e) => {
                      e.preventDefault()
                      console.log(`[AVTech] Speed button ${speed} clicked!`)
                      if (socketRef.current) {
                        socketRef.current.emit('settings:update', { eventId, animationSpeed: speed })
                        setAnimationSpeed(speed)
                        console.log(`[AVTech] Emitted animationSpeed:`, speed)
                      }
                    }}
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
                    onClick={() => {
                      console.log(`[AVTech] Spawn direction clicked:`, option.value)
                      if (socketRef.current) {
                        socketRef.current.emit('settings:update', { eventId, spawnDirection: option.value })
                        setSpawnDirection(option.value)
                        console.log(`[AVTech] Emitted spawnDirection:`, option.value)
                      }
                    }}
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
                    onClick={() => {
                      console.log(`[AVTech] Spawn position clicked:`, option.value)
                      if (socketRef.current) {
                        socketRef.current.emit('settings:update', { eventId, spawnPosition: option.value })
                        setSpawnPosition(option.value)
                        console.log(`[AVTech] Emitted spawnPosition:`, option.value)
                      }
                    }}
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
            {/* Poll Settings Row */}
            <div className="poll-settings-row">
              <div className="poll-position-selector">
                <label className="setting-label">Position:</label>
                <select
                  className="position-select"
                  value={pollPosition}
                  onChange={(e) => {
                    const value = e.target.value
                    console.log(`[AVTech] Poll position changed to:`, value)
                    if (socketRef.current) {
                      socketRef.current.emit('settings:update', { eventId, pollPosition: value })
                      setPollPosition(value)
                      console.log(`[AVTech] Emitted pollPosition:`, value)
                    }
                  }}
                >
                  {POLL_POSITIONS.map(pos => (
                    <option key={pos.value} value={pos.value}>{pos.label}</option>
                  ))}
                </select>
              </div>
              <div className="poll-position-selector">
                <label className="setting-label">Size:</label>
                <select
                  className="position-select"
                  value={pollSize}
                  onChange={(e) => {
                    const value = e.target.value
                    console.log(`[AVTech] Poll size changed to:`, value)
                    if (socketRef.current) {
                      socketRef.current.emit('settings:update', { eventId, pollSize: value })
                      setPollSize(value)
                      console.log(`[AVTech] Emitted pollSize:`, value)
                    }
                  }}
                >
                  {POLL_SIZES.map(size => (
                    <option key={size.value} value={size.value}>{size.label}</option>
                  ))}
                </select>
              </div>
              <button className="action-btn secondary" onClick={generateTestPoll}>
                🧪 Generate Test Poll
              </button>
            </div>

            {/* Active Polls */}
            {activePolls.length === 0 && archivedPolls.length === 0 ? (
              <p className="no-polls-message">No polls available. Create polls in the Producer panel or generate a test poll.</p>
            ) : (
              <>
                {activePolls.length > 0 && (
                  <div className="poll-control-list">
                    {activePolls.map(poll => (
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

                        {/* Show vote count for live polls */}
                        {poll.status === 'live' && (
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
                              <button
                                className="poll-ctrl-btn secondary"
                                onClick={() => resetPoll(poll.id)}
                              >
                                🔄 Reset
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

                {/* Archived Polls Toggle */}
                {archivedPolls.length > 0 && (
                  <div className="archived-section">
                    <label className="archive-toggle">
                      <input
                        type="checkbox"
                        checked={showArchived}
                        onChange={(e) => setShowArchived(e.target.checked)}
                      />
                      <span>Show Archived Polls ({archivedPolls.length})</span>
                    </label>

                    {showArchived && (
                      <div className="poll-control-list archived-list">
                        {archivedPolls.map(poll => (
                          <div key={poll.id} className="poll-control-card archived">
                            <div className="poll-control-header">
                              <span
                                className="poll-status-badge"
                                style={{ backgroundColor: getStatusColor(poll.status) }}
                              >
                                {poll.status.toUpperCase()}
                              </span>
                              <span className="poll-question-preview">{poll.question}</span>
                            </div>

                            <div className="poll-vote-count">
                              {poll.results?.totalVotes || 0} votes
                              {poll.showOnDisplay && <span className="on-display-badge">ON DISPLAY</span>}
                            </div>

                            <div className="poll-control-actions">
                              <button
                                className={`poll-ctrl-btn ${poll.showResults ? 'active' : 'secondary'}`}
                                onClick={() => toggleShowResults(poll.id, poll.showResults)}
                              >
                                {poll.showResults ? '📊 Hide Results' : '📊 Show Results'}
                              </button>
                              <button
                                className="poll-ctrl-btn secondary"
                                onClick={() => resetPoll(poll.id)}
                              >
                                🔄 Reset to Ready
                              </button>
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
                )}

                {/* Bundles Section */}
                {bundles.length > 0 && (
                  <div className="bundles-section">
                    <h4 className="subsection-title">Poll Bundles</h4>

                    {bundles.map(bundle => (
                      <div key={bundle.id} className={`bundle-card ${bundle.status}`}>
                        <div className="bundle-header" onClick={() => toggleBundleExpanded(bundle.id)}>
                          <span className="bundle-status-badge">{bundle.status.toUpperCase()}</span>
                          <span className="bundle-name">{bundle.name}</span>
                          <span className="bundle-progress">
                            {bundle.status === 'active'
                              ? `${bundle.currentIndex + 1}/${bundle.pollIds.length}`
                              : `${bundle.pollIds.length} polls`}
                          </span>
                          <span className="bundle-chevron">{expandedBundles.has(bundle.id) ? '▼' : '▶'}</span>
                        </div>

                        {expandedBundles.has(bundle.id) && (
                          <div className="bundle-content">
                            {/* List polls with current indicator */}
                            {bundle.pollIds.map((pollId, idx) => {
                              const poll = polls.find(p => p.id === pollId)
                              const isCurrent = bundle.status === 'active' && idx === bundle.currentIndex
                              return (
                                <div key={pollId} className={`bundle-poll-item ${isCurrent ? 'current' : ''}`}>
                                  <span className="bundle-poll-number">{idx + 1}.</span>
                                  <span className="bundle-poll-question">{poll?.question || 'Unknown poll'}</span>
                                  <span className={`bundle-poll-status ${poll?.status || ''}`}>
                                    {poll?.status?.toUpperCase() || '?'}
                                  </span>
                                </div>
                              )
                            })}

                            {/* Bundle controls */}
                            <div className="bundle-controls">
                              {bundle.status === 'ready' && bundle.pollIds.length > 0 && (
                                <button className="poll-ctrl-btn primary" onClick={() => startBundle(bundle.id)}>
                                  ▶️ Start Bundle
                                </button>
                              )}
                              {bundle.status === 'active' && (() => {
                                const currentPollId = bundle.pollIds[bundle.currentIndex]
                                const currentPoll = polls.find(p => p.id === currentPollId)
                                const isLastPoll = bundle.currentIndex >= bundle.pollIds.length - 1

                                // If poll has liveResults, skip show results step
                                // Otherwise: show "Show Results" first, then "Next Poll"
                                if (currentPoll?.liveResults || currentPoll?.showResults) {
                                  return (
                                    <>
                                      {!currentPoll?.showResults && (
                                        <button
                                          className="poll-ctrl-btn secondary"
                                          onClick={() => toggleShowResults(currentPollId, false)}
                                        >
                                          📊 Show Results
                                        </button>
                                      )}
                                      <button
                                        className="poll-ctrl-btn primary"
                                        onClick={() => advanceBundle(bundle.id)}
                                      >
                                        {isLastPoll ? '✓ Finish Bundle' : `⏭️ Next Poll (${bundle.currentIndex + 2}/${bundle.pollIds.length})`}
                                      </button>
                                    </>
                                  )
                                } else {
                                  // Results not showing yet - show "Show Results" button
                                  return (
                                    <button
                                      className="poll-ctrl-btn primary"
                                      onClick={() => toggleShowResults(currentPollId, false)}
                                    >
                                      📊 Show Results
                                    </button>
                                  )
                                }
                              })()}
                              {bundle.status === 'completed' && (
                                <span className="bundle-completed-text">✓ Bundle completed</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Timer Control Section */}
        <section className="avtech-section">
          <button
            className="section-header-btn"
            onClick={() => setTimerControlOpen(!timerControlOpen)}
          >
            <h2 className="section-title">Timer Control</h2>
            <span className={`section-chevron ${timerControlOpen ? 'open' : ''}`}>
              ▼
            </span>
          </button>

          <div className={`collapsible-content ${timerControlOpen ? 'open' : ''}`}>
            {timers.length === 0 ? (
              <p className="no-polls-message">No timers available. Create timers in the Producer panel.</p>
            ) : (
              <div className="poll-control-list">
                {timers.map(timer => (
                  <div key={timer.id} className="poll-control-card timer-control-card">
                    <div className="poll-control-header">
                      <span
                        className="poll-status-badge"
                        style={{ backgroundColor: getStatusColor(timer.status) }}
                      >
                        {timer.status.toUpperCase()}
                      </span>
                      <span className="poll-question-preview">{timer.name}</span>
                    </div>

                    <div className="timer-control-info">
                      <span className="timer-type-badge">
                        {timer.type === 'countdown' ? '⏱️ Countdown' : '⏲️ Stopwatch'}
                      </span>
                      <span
                        className={`timer-current-time timer-live ${timer.status === 'running' ? 'running' : ''}`}
                        style={{ color: timer.status === 'running' ? (timer.color || '#ffffff') : undefined }}
                      >
                        {formatTimerDisplay(timer)}
                      </span>
                    </div>

                    {/* Per-timer display settings */}
                    <div className="timer-settings-row">
                      <select
                        className="timer-setting-select"
                        value={timer.position || 'center'}
                        onChange={(e) => {
                          if (socketRef.current) {
                            socketRef.current.emit('timer:update-settings', {
                              eventId,
                              timerId: timer.id,
                              position: e.target.value
                            })
                          }
                        }}
                        title="Position"
                      >
                        {TIMER_POSITIONS.map(pos => (
                          <option key={pos.value} value={pos.value}>{pos.label}</option>
                        ))}
                      </select>
                      <select
                        className="timer-setting-select"
                        value={timer.size || 'medium'}
                        onChange={(e) => {
                          if (socketRef.current) {
                            socketRef.current.emit('timer:update-settings', {
                              eventId,
                              timerId: timer.id,
                              size: e.target.value
                            })
                          }
                        }}
                        title="Size"
                      >
                        {TIMER_SIZES.map(size => (
                          <option key={size.value} value={size.value}>{size.label}</option>
                        ))}
                      </select>
                      <select
                        className="timer-setting-select"
                        value={timer.style || 'digital'}
                        onChange={(e) => {
                          if (socketRef.current) {
                            socketRef.current.emit('timer:update-settings', {
                              eventId,
                              timerId: timer.id,
                              style: e.target.value
                            })
                          }
                        }}
                        title="Style"
                      >
                        {TIMER_STYLES.map(style => (
                          <option key={style.value} value={style.value}>{style.label}</option>
                        ))}
                      </select>
                      <select
                        className="timer-setting-select timer-color-select"
                        value={timer.color || '#ffffff'}
                        onChange={(e) => {
                          if (socketRef.current) {
                            socketRef.current.emit('timer:update-settings', {
                              eventId,
                              timerId: timer.id,
                              color: e.target.value
                            })
                          }
                        }}
                        style={{ color: timer.color || '#ffffff' }}
                        title="Color"
                      >
                        {TIMER_COLORS.map(color => (
                          <option key={color.value} value={color.value} style={{ color: color.value }}>{color.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Custom display text input */}
                    <div className="timer-display-text-input">
                      <input
                        type="text"
                        placeholder="Optional text to show below timer..."
                        value={timer.displayText || ''}
                        onChange={(e) => {
                          if (socketRef.current) {
                            socketRef.current.emit('timer:update-display-text', {
                              eventId,
                              timerId: timer.id,
                              displayText: e.target.value
                            })
                          }
                        }}
                        maxLength={200}
                        className="timer-text-input"
                      />
                    </div>

                    <div className="poll-control-actions">
                      {!timer.showOnDisplay ? (
                        <button
                          className="poll-ctrl-btn primary"
                          onClick={() => sendTimerToDisplay(timer.id)}
                          disabled={timer.status === 'ready' || timers.filter(t => t.showOnDisplay).length >= 3}
                          title={timers.filter(t => t.showOnDisplay).length >= 3 ? 'Max 3 timers on display' : ''}
                        >
                          📺 Send to Display
                        </button>
                      ) : (
                        <button
                          className="poll-ctrl-btn danger"
                          onClick={() => hideTimerFromDisplay(timer.id)}
                        >
                          🚫 Hide from Display
                        </button>
                      )}
                    </div>

                    {timer.showOnDisplay && (
                      <div className="timer-on-display-indicator">
                        📺 Currently on display
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Q&A Control Section */}
        <section className="avtech-section">
          <button
            className="section-header-btn"
            onClick={() => setQaSectionOpen(!qaSectionOpen)}
          >
            <h2 className="section-title">
              Q&A Control
              {getQuestionCounts().pending > 0 && (
                <span className="qa-pending-badge">{getQuestionCounts().pending}</span>
              )}
            </h2>
            <span className={`section-chevron ${qaSectionOpen ? 'open' : ''}`}>
              ▼
            </span>
          </button>

          <div className={`collapsible-content ${qaSectionOpen ? 'open' : ''}`}>
            {/* Q&A Toggle */}
            <div className="qa-toggle-row">
              <span className="qa-toggle-label">Q&A Submissions</span>
              <button
                className={`qa-toggle-btn ${qaEnabled ? 'enabled' : ''}`}
                onClick={() => toggleQA(!qaEnabled)}
              >
                {qaEnabled ? 'ON' : 'OFF'}
              </button>
              <span className="qa-toggle-hint">
                {qaEnabled ? 'Audience can submit questions' : 'Q&A is closed'}
              </span>
            </div>

            {/* Q&A Display Settings */}
            <div className="poll-settings-row">
              <div className="poll-position-selector">
                <label className="setting-label">Display Position:</label>
                <select
                  className="position-select"
                  value={qaPosition}
                  onChange={(e) => {
                    const value = e.target.value
                    if (socketRef.current) {
                      socketRef.current.emit('settings:update', { eventId, qaPosition: value })
                      setQaPosition(value)
                    }
                  }}
                >
                  {QA_POSITIONS.map(pos => (
                    <option key={pos.value} value={pos.value}>{pos.label}</option>
                  ))}
                </select>
              </div>
              <div className="poll-position-selector">
                <label className="setting-label">Size:</label>
                <select
                  className="position-select"
                  value={qaSize}
                  onChange={(e) => {
                    const value = e.target.value
                    if (socketRef.current) {
                      socketRef.current.emit('settings:update', { eventId, qaSize: value })
                      setQaSize(value)
                    }
                  }}
                >
                  {QA_SIZES.map(size => (
                    <option key={size.value} value={size.value}>{size.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="qa-filter-tabs">
              <button
                className={`qa-filter-tab ${qaFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setQaFilter('pending')}
              >
                Pending
                {getQuestionCounts().pending > 0 && (
                  <span className="qa-tab-count">{getQuestionCounts().pending}</span>
                )}
              </button>
              <button
                className={`qa-filter-tab ${qaFilter === 'approved' ? 'active' : ''}`}
                onClick={() => setQaFilter('approved')}
              >
                Approved
                {getQuestionCounts().approved + getQuestionCounts().featured > 0 && (
                  <span className="qa-tab-count">{getQuestionCounts().approved + getQuestionCounts().featured}</span>
                )}
              </button>
              <button
                className={`qa-filter-tab ${qaFilter === 'all' ? 'active' : ''}`}
                onClick={() => setQaFilter('all')}
              >
                All
              </button>
            </div>

            {/* Questions List */}
            <div className="qa-questions-list">
              {getFilteredQuestions().length === 0 ? (
                <p className="qa-empty-message">
                  {qaFilter === 'pending' && 'No pending questions'}
                  {qaFilter === 'approved' && 'No approved questions'}
                  {qaFilter === 'all' && 'No questions yet'}
                </p>
              ) : (
                getFilteredQuestions()
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map(question => (
                    <div key={question.id} className={`qa-question-card ${question.status}`}>
                      <div className="qa-question-header">
                        <span className={`qa-status-badge ${question.status}`}>
                          {question.status === 'featured' ? 'LIVE' : question.status.toUpperCase()}
                        </span>
                        <span className="qa-author">{question.authorName}</span>
                        <span className="qa-time">
                          {new Date(question.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="qa-question-text">{question.text}</p>
                      <div className="qa-question-actions">
                        {question.status === 'pending' && (
                          <>
                            <button
                              className="qa-action-btn approve"
                              onClick={() => approveQuestion(question.id)}
                            >
                              Approve
                            </button>
                            <button
                              className="qa-action-btn feature"
                              onClick={() => featureQuestion(question.id)}
                            >
                              Feature
                            </button>
                            <button
                              className="qa-action-btn reject"
                              onClick={() => rejectQuestion(question.id)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {question.status === 'approved' && (
                          <>
                            <button
                              className="qa-action-btn feature"
                              onClick={() => featureQuestion(question.id)}
                            >
                              Feature
                            </button>
                            <button
                              className="qa-action-btn reject"
                              onClick={() => rejectQuestion(question.id)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {question.status === 'featured' && (
                          <button
                            className="qa-action-btn unfeature"
                            onClick={() => unfeatureQuestion(question.id)}
                          >
                            Unfeature
                          </button>
                        )}
                        <button
                          className="qa-action-btn delete"
                          onClick={() => deleteQuestion(question.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </section>

        {/* Display URLs */}
        <section className="avtech-section">
          <h2 className="section-title">Display Sources</h2>

          {/* Display Tabs */}
          <div className="display-tabs">
            <button
              className={`display-tab ${activeDisplayTab === 'mixed' ? 'active' : ''}`}
              onClick={() => setActiveDisplayTab('mixed')}
            >
              Mixed
            </button>
            <button
              className={`display-tab ${activeDisplayTab === 'emojis' ? 'active' : ''}`}
              onClick={() => setActiveDisplayTab('emojis')}
            >
              Emojis
            </button>
            <button
              className={`display-tab ${activeDisplayTab === 'polls' ? 'active' : ''}`}
              onClick={() => setActiveDisplayTab('polls')}
            >
              Polls
            </button>
            <button
              className={`display-tab ${activeDisplayTab === 'timers' ? 'active' : ''}`}
              onClick={() => setActiveDisplayTab('timers')}
            >
              Timers
            </button>
            <button
              className={`display-tab ${activeDisplayTab === 'qa' ? 'active' : ''}`}
              onClick={() => setActiveDisplayTab('qa')}
            >
              Q&A
            </button>
          </div>

          {/* Tab Content */}
          <div className="display-tab-content">
            {activeDisplayTab === 'mixed' && (
              <div className="display-source-card">
                <div className="display-source-header">
                  <span className="display-source-title">Mixed Display</span>
                  <span className="display-source-desc">Emojis + Polls combined</span>
                </div>
                <div className="display-source-actions">
                  <button
                    className="display-open-btn"
                    onClick={() => window.open(`${window.location.origin}/display?eventId=${eventId}&hideUI=true`, '_blank')}
                  >
                    Open Display
                  </button>
                  <button
                    className="display-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/display?eventId=${eventId}&hideUI=true`)
                    }}
                  >
                    Copy URL
                  </button>
                  <label className="display-link-toggle">
                    <input
                      type="checkbox"
                      checked={showDisplayLinks.mixed}
                      onChange={(e) => setShowDisplayLinks(prev => ({ ...prev, mixed: e.target.checked }))}
                    />
                    <span>Show Link</span>
                  </label>
                </div>
                {showDisplayLinks.mixed && (
                  <code className="url-code">
                    {window.location.origin}/display?eventId={eventId}&hideUI=true
                  </code>
                )}
              </div>
            )}

            {activeDisplayTab === 'emojis' && (
              <div className="display-source-card">
                <div className="display-source-header">
                  <span className="display-source-title">Emojis Only</span>
                  <span className="display-source-desc">Floating emoji reactions</span>
                </div>
                <div className="display-source-actions">
                  <button
                    className="display-open-btn"
                    onClick={() => window.open(`${window.location.origin}/display-emojis?eventId=${eventId}&hideUI=true`, '_blank')}
                  >
                    Open Display
                  </button>
                  <button
                    className="display-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/display-emojis?eventId=${eventId}&hideUI=true`)
                    }}
                  >
                    Copy URL
                  </button>
                  <label className="display-link-toggle">
                    <input
                      type="checkbox"
                      checked={showDisplayLinks.emojis}
                      onChange={(e) => setShowDisplayLinks(prev => ({ ...prev, emojis: e.target.checked }))}
                    />
                    <span>Show Link</span>
                  </label>
                </div>
                {showDisplayLinks.emojis && (
                  <code className="url-code">
                    {window.location.origin}/display-emojis?eventId={eventId}&hideUI=true
                  </code>
                )}
              </div>
            )}

            {activeDisplayTab === 'polls' && (
              <div className="display-source-card">
                <div className="display-source-header">
                  <span className="display-source-title">Polls Only</span>
                  <span className="display-source-desc">Poll overlay display</span>
                </div>
                <div className="display-source-actions">
                  <button
                    className="display-open-btn"
                    onClick={() => window.open(`${window.location.origin}/display-polls?eventId=${eventId}&hideUI=true`, '_blank')}
                  >
                    Open Display
                  </button>
                  <button
                    className="display-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/display-polls?eventId=${eventId}&hideUI=true`)
                    }}
                  >
                    Copy URL
                  </button>
                  <label className="display-link-toggle">
                    <input
                      type="checkbox"
                      checked={showDisplayLinks.polls}
                      onChange={(e) => setShowDisplayLinks(prev => ({ ...prev, polls: e.target.checked }))}
                    />
                    <span>Show Link</span>
                  </label>
                </div>
                {showDisplayLinks.polls && (
                  <code className="url-code">
                    {window.location.origin}/display-polls?eventId={eventId}&hideUI=true
                  </code>
                )}
              </div>
            )}

            {activeDisplayTab === 'timers' && (
              <div className="display-source-card">
                <div className="display-source-header">
                  <span className="display-source-title">Timers Only</span>
                  <span className="display-source-desc">Countdown/Stopwatch overlay</span>
                </div>
                <div className="display-source-actions">
                  <button
                    className="display-open-btn"
                    onClick={() => window.open(`${window.location.origin}/display-timers?eventId=${eventId}&hideUI=true`, '_blank')}
                  >
                    Open Display
                  </button>
                  <button
                    className="display-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/display-timers?eventId=${eventId}&hideUI=true`)
                    }}
                  >
                    Copy URL
                  </button>
                  <label className="display-link-toggle">
                    <input
                      type="checkbox"
                      checked={showDisplayLinks.timers}
                      onChange={(e) => setShowDisplayLinks(prev => ({ ...prev, timers: e.target.checked }))}
                    />
                    <span>Show Link</span>
                  </label>
                </div>
                {showDisplayLinks.timers && (
                  <code className="url-code">
                    {window.location.origin}/display-timers?eventId={eventId}&hideUI=true
                  </code>
                )}
              </div>
            )}

            {activeDisplayTab === 'qa' && (
              <div className="display-source-card">
                <div className="display-source-header">
                  <span className="display-source-title">Q&A Only</span>
                  <span className="display-source-desc">Featured questions overlay</span>
                </div>
                <div className="display-source-actions">
                  <button
                    className="display-open-btn"
                    onClick={() => window.open(`${window.location.origin}/display-qa?eventId=${eventId}&hideUI=true`, '_blank')}
                  >
                    Open Display
                  </button>
                  <button
                    className="display-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/display-qa?eventId=${eventId}&hideUI=true`)
                    }}
                  >
                    Copy URL
                  </button>
                  <label className="display-link-toggle">
                    <input
                      type="checkbox"
                      checked={showDisplayLinks.qa}
                      onChange={(e) => setShowDisplayLinks(prev => ({ ...prev, qa: e.target.checked }))}
                    />
                    <span>Show Link</span>
                  </label>
                </div>
                {showDisplayLinks.qa && (
                  <code className="url-code">
                    {window.location.origin}/display-qa?eventId={eventId}&hideUI=true
                  </code>
                )}
              </div>
            )}

            {/* URL Parameters Help */}
            <div className="display-url-help">
              <span className="help-title">URL Parameters:</span>
              <div className="help-items">
                <code>&mode=chroma</code> <span>Green screen background</span>
                <code>&chroma=#FF0000</code> <span>Custom chroma color</span>
              </div>
            </div>
          </div>

          {/* Audience Page Link */}
          <div className="audience-link-section">
            <span className="url-label">Audience Page:</span>
            <div className="audience-link-actions">
              <button
                className="display-open-btn"
                onClick={() => window.open(`${window.location.origin}/audience/${eventId}`, '_blank')}
              >
                Open
              </button>
              <button
                className="display-copy-btn"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/audience/${eventId}`)}
              >
                Copy URL
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default AVTech
