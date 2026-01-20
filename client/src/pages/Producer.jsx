import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { getSession, signOut } from '../lib/auth'
import './Producer.css'

function Producer() {
  const { eventId = 'default' } = useParams()
  const navigate = useNavigate()
  const [connected, setConnected] = useState(false)
  const [authError, setAuthError] = useState(null)
  const socketRef = useRef(null)

  // Polls state
  const [polls, setPolls] = useState([])
  const [pollSectionOpen, setPollSectionOpen] = useState(true)

  // Create poll form
  const [newQuestion, setNewQuestion] = useState('')
  const [newOptions, setNewOptions] = useState(['', ''])
  const [allowChange, setAllowChange] = useState(false)
  const [duration, setDuration] = useState(null)
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(null)
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [liveResults, setLiveResults] = useState(false)
  const [targetBundleId, setTargetBundleId] = useState(null) // null = individual poll
  const [showPollForm, setShowPollForm] = useState(false) // Controls visibility of poll form
  const [inlinePollBundleId, setInlinePollBundleId] = useState(null) // For adding polls inside a bundle

  // Bundle state
  const [bundles, setBundles] = useState([])
  const [newBundleName, setNewBundleName] = useState('')
  const [expandedBundles, setExpandedBundles] = useState(new Set())
  const [showBundleForm, setShowBundleForm] = useState(false)

  // Drag state
  const [draggedPollId, setDraggedPollId] = useState(null)

  // Stats
  const [stats, setStats] = useState({
    totalReactions: 0,
    queueLength: 0,
    activeDisplays: 0
  })

  // Emoji pack state
  const [emojiSectionOpen, setEmojiSectionOpen] = useState(true)
  const [emojiTemplates, setEmojiTemplates] = useState([])
  const [customEmojiPacks, setCustomEmojiPacks] = useState([])
  const [activeEmojiPackId, setActiveEmojiPackId] = useState('standard')
  const [showPackBuilder, setShowPackBuilder] = useState(false)
  const [editingPackId, setEditingPackId] = useState(null)
  const [newPackName, setNewPackName] = useState('')
  const [packEmojis, setPackEmojis] = useState([])
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)

  // Q&A state
  const [qaSectionOpen, setQaSectionOpen] = useState(true)
  const [qaEnabled, setQaEnabled] = useState(false)
  const [questions, setQuestions] = useState([])
  const [qaFilter, setQaFilter] = useState('pending') // 'pending' | 'approved' | 'rejected' | 'all'

  // AVTech password state
  const [avtechPassword, setAvtechPassword] = useState('0000')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  // Timer state
  const [timerSectionOpen, setTimerSectionOpen] = useState(true)
  const [timers, setTimers] = useState([])
  const [showTimerForm, setShowTimerForm] = useState(false)
  const [newTimerName, setNewTimerName] = useState('')
  const [newTimerType, setNewTimerType] = useState('countdown')
  const [newTimerMinutes, setNewTimerMinutes] = useState(5)
  const [newTimerSeconds, setNewTimerSeconds] = useState(0)

  // AVTech password handlers
  const handlePasswordChange = () => {
    if (!newPassword || newPassword.length < 4) {
      alert('Password must be at least 4 characters')
      return
    }

    socketRef.current?.emit('avtech:set-password', {
      eventId,
      password: newPassword
    })

    setAvtechPassword(newPassword)
    setShowPasswordModal(false)
    setNewPassword('')
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Could add a toast notification here
        console.log('Copied to clipboard:', text)
      })
      .catch(err => {
        console.error('Failed to copy:', err)
      })
  }

  // Common emojis for the picker
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰',
    '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗',
    '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
    '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
    '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕',
    '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰',
    '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤',
    '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻',
    '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
    '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💯', '💢', '💥', '💫',
    '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '👋', '🤚',
    '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈',
    '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏',
    '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵',
    '🔥', '⭐', '🌟', '✨', '💫', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈',
    '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎵', '🎶', '🎸', '🎹', '🎤',
    '🎧', '🎷', '🎺', '🥁', '🎬', '🎮', '🎯', '🎲', '🧩', '🚀', '✈️', '🚗'
  ]

  useEffect(() => {
    // Initialize socket with authentication
    const initSocket = async () => {
      try {
        console.log('[Producer] Initializing socket connection...')

        // Get current session
        const { session, error } = await getSession()

        console.log('[Producer] Session check:', {
          hasSession: !!session,
          hasError: !!error,
          userId: session?.user?.id
        })

        if (error || !session) {
          console.error('[Producer] No valid session:', error)
          setAuthError('Authentication required. Please log in.')
          navigate('/login')
          return
        }

        // Get JWT token
        const token = session.access_token
        console.log('[Producer] Got JWT token, connecting socket...')

        // Initialize socket with auth token
        const newSocket = io('http://localhost:3001', {
          auth: {
            token,
            role: 'producer'
          }
        })

        socketRef.current = newSocket

        // IMPORTANT: Set up all event listeners BEFORE the connect event
        // This ensures listeners are ready when server broadcasts data after join-event

        // Listen for poll sync
        newSocket.on('poll:sync', (pollsData) => {
          console.log('[Producer] Received poll:sync event:', pollsData)
          console.log('[Producer] Number of polls:', pollsData?.length)
          setPolls(pollsData)
        })

        // Listen for poll results updates
        newSocket.on('poll:results', ({ pollId, results }) => {
          setPolls(prev => prev.map(poll =>
            poll.id === pollId ? { ...poll, results } : poll
          ))
        })

        // Listen for stats updates
        newSocket.on('stats:update', (data) => {
          setStats(data)
        })

        // Listen for bundle sync
        newSocket.on('bundle:sync', (bundlesData) => {
          setBundles(bundlesData)
        })

        // Listen for emoji pack sync
        newSocket.on('emoji-pack:sync', ({ templates, customPacks, activePackId }) => {
          setEmojiTemplates(templates)
          setCustomEmojiPacks(customPacks)
          setActiveEmojiPackId(activePackId)
        })

        // Listen for Q&A sync
        newSocket.on('qa:sync', ({ enabled, questions: questionsList }) => {
          setQaEnabled(enabled)
          setQuestions(questionsList)
        })

        // Listen for AVTech password sync
        newSocket.on('avtech:password-sync', ({ password }) => {
          setAvtechPassword(password)
        })

        // Listen for timer sync
        newSocket.on('timer:sync', (timersData) => {
          console.log('[Producer] Received timer:sync event:', timersData)
          setTimers(timersData)
        })

        // Listen for timer tick updates (live countdown)
        newSocket.on('timer:tick', (tickData) => {
          setTimers(prev => prev.map(timer =>
            timer.id === tickData.timerId
              ? { ...timer, currentElapsed: tickData.elapsed }
              : timer
          ))
        })

        newSocket.on('connect', () => {
          console.log('[Producer] ✓ Socket connected to server')
          console.log('[Producer] Socket ID:', newSocket.id)
          setConnected(true)
          setAuthError(null)
          // Emit join-event - listeners are already set up above
          console.log('[Producer] Emitting join-event with:', { eventId, role: 'producer' })
          newSocket.emit('join-event', { eventId, role: 'producer' })
          // Request current password after joining
          newSocket.emit('avtech:get-password', { eventId })
        })

        newSocket.on('disconnect', () => {
          console.log('[Producer] ✗ Socket disconnected')
          setConnected(false)
        })

        newSocket.on('connect_error', (err) => {
          console.error('[Producer] Socket connection error:', err.message)
          if (err.message.includes('Authentication') || err.message.includes('token')) {
            setAuthError('Authentication failed. Please log in again.')
            navigate('/login')
          }
        })

        newSocket.on('error', (error) => {
          console.error('[Producer] Socket error:', error)
          if (error.message && error.message.includes('Unauthorized')) {
            setAuthError(error.message)
          }
        })
      } catch (err) {
        console.error('[Producer] Failed to initialize socket:', err)
        setAuthError('Failed to connect. Please try again.')
      }
    }

    initSocket()

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [eventId, navigate])

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
      // Adjust correct answer index if needed
      if (correctAnswerIndex === index) {
        setCorrectAnswerIndex(null)
      } else if (correctAnswerIndex !== null && correctAnswerIndex > index) {
        setCorrectAnswerIndex(correctAnswerIndex - 1)
      }
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
    console.log('[Producer] createPoll called')
    console.log('[Producer] Socket ref:', socketRef.current)
    console.log('[Producer] Event ID:', eventId)

    const trimmedQuestion = newQuestion.trim()
    const trimmedOptions = newOptions.map(o => o.trim()).filter(o => o)

    console.log('[Producer] Question:', trimmedQuestion)
    console.log('[Producer] Options:', trimmedOptions)

    if (!trimmedQuestion) {
      alert('Please enter a question')
      return
    }

    if (trimmedOptions.length < 2) {
      alert('Please enter at least 2 options')
      return
    }

    // Server expects options as string array, not objects
    // The server will create the option objects internally
    const pollData = {
      eventId,
      question: trimmedQuestion,
      options: trimmedOptions, // Send as string array
      allowChange,
      durationSeconds: duration,
      allowMultiple,
      liveResults,
      bundleId: targetBundleId
    }

    console.log('[Producer] Emitting poll:create with data:', pollData)
    socketRef.current?.emit('poll:create', pollData)
    console.log('[Producer] poll:create emitted')

    // Reset form
    setNewQuestion('')
    setNewOptions(['', ''])
    setAllowChange(false)
    setDuration(null)
    setCorrectAnswerIndex(null)
    setAllowMultiple(false)
    setLiveResults(false)

    // If creating individual poll, hide form after creation
    if (!targetBundleId && !inlinePollBundleId) {
      setShowPollForm(false)
    }
    // Keep forms open if adding to bundle (user may want to add more)
  }

  // Reset and close poll form
  const closePollForm = () => {
    setNewQuestion('')
    setNewOptions(['', ''])
    setAllowChange(false)
    setDuration(null)
    setCorrectAnswerIndex(null)
    setAllowMultiple(false)
    setLiveResults(false)
    setTargetBundleId(null)
    setShowPollForm(false)
    setInlinePollBundleId(null)
  }

  // Start adding poll inside a bundle
  const startInlinePollCreation = (bundleId) => {
    setInlinePollBundleId(bundleId)
    setTargetBundleId(bundleId)
    setNewQuestion('')
    setNewOptions(['', ''])
    setAllowChange(false)
    setDuration(null)
    setCorrectAnswerIndex(null)
    setAllowMultiple(false)
    setLiveResults(false)
  }

  // Cancel inline poll creation
  const cancelInlinePollCreation = () => {
    setInlinePollBundleId(null)
    setTargetBundleId(null)
    setNewQuestion('')
    setNewOptions(['', ''])
  }

  // Delete a poll
  const deletePoll = (pollId) => {
    if (confirm('Are you sure you want to delete this poll?')) {
      socketRef.current?.emit('poll:delete', { eventId, pollId })
    }
  }

  // Bundle functions
  const createBundle = () => {
    const name = newBundleName.trim()
    if (!name) {
      alert('Please enter a bundle name')
      return
    }
    socketRef.current?.emit('bundle:create', { eventId, name })
    setNewBundleName('')
    setShowBundleForm(false)
  }

  const addPollToBundle = (bundleId, pollId) => {
    socketRef.current?.emit('bundle:add-poll', { eventId, bundleId, pollId })
  }

  const removePollFromBundle = (bundleId, pollId) => {
    socketRef.current?.emit('bundle:remove-poll', { eventId, bundleId, pollId })
  }

  const deleteBundle = (bundleId) => {
    if (confirm('Are you sure you want to delete this bundle? Polls will not be deleted.')) {
      socketRef.current?.emit('bundle:delete', { eventId, bundleId })
    }
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

  // Drag and drop handlers
  const handleDragStart = (e, pollId) => {
    setDraggedPollId(pollId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDropOnBundle = (e, bundleId) => {
    e.preventDefault()
    if (draggedPollId) {
      const poll = polls.find(p => p.id === draggedPollId)
      if (poll && poll.status === 'ready' && !poll.bundleId) {
        addPollToBundle(bundleId, draggedPollId)
      }
    }
    setDraggedPollId(null)
  }

  const handleDragEnd = () => {
    setDraggedPollId(null)
  }

  // ============================================
  // Emoji Pack Functions
  // ============================================

  // Set active emoji pack
  const setActiveEmojiPack = (packId) => {
    socketRef.current?.emit('emoji-pack:set-active', { eventId, packId })
  }

  // Start creating a new pack
  const startNewPack = () => {
    setEditingPackId(null)
    setNewPackName('')
    setPackEmojis([])
    setShowPackBuilder(true)
  }

  // Start editing an existing pack
  const startEditPack = (pack) => {
    setEditingPackId(pack.id)
    setNewPackName(pack.name)
    setPackEmojis([...pack.emojis])
    setShowPackBuilder(true)
  }

  // Copy template to create custom pack
  const copyTemplateToCustom = (template) => {
    setEditingPackId(null)
    setNewPackName(`${template.name} (Copy)`)
    setPackEmojis([...template.emojis])
    setShowPackBuilder(true)
  }

  // Add emoji to current pack being edited
  const addEmojiToPack = (emoji) => {
    if (packEmojis.length < 20) {
      setPackEmojis([...packEmojis, emoji])
    }
  }

  // Remove emoji from current pack being edited
  const removeEmojiFromPack = (index) => {
    setPackEmojis(packEmojis.filter((_, i) => i !== index))
  }

  // Save the pack (create or update)
  const savePack = () => {
    const name = newPackName.trim()
    if (!name) {
      alert('Please enter a pack name')
      return
    }
    if (packEmojis.length === 0) {
      alert('Please add at least one emoji')
      return
    }

    if (editingPackId) {
      // Update existing pack
      socketRef.current?.emit('emoji-pack:update', { eventId, packId: editingPackId, name, emojis: packEmojis })
    } else {
      // Create new pack
      socketRef.current?.emit('emoji-pack:create', { eventId, name, emojis: packEmojis })
    }

    setShowPackBuilder(false)
    setEditingPackId(null)
    setNewPackName('')
    setPackEmojis([])
  }

  // Cancel pack editing
  const cancelPackBuilder = () => {
    setShowPackBuilder(false)
    setEditingPackId(null)
    setNewPackName('')
    setPackEmojis([])
    setEmojiPickerOpen(false)
  }

  // Delete a custom pack
  const deletePack = (packId) => {
    if (confirm('Are you sure you want to delete this emoji pack?')) {
      socketRef.current?.emit('emoji-pack:delete', { eventId, packId })
    }
  }

  // Handle custom image upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      alert('Image too large. Maximum size is 500KB')
      return
    }

    // Convert to base64 data URL
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result
      if (dataUrl && packEmojis.length < 20) {
        setPackEmojis([...packEmojis, dataUrl])
      }
    }
    reader.readAsDataURL(file)

    // Reset input
    e.target.value = ''
  }

  // ============================================
  // Q&A Functions
  // ============================================

  // Toggle Q&A enabled/disabled
  const toggleQA = (enabled) => {
    socketRef.current?.emit('qa:toggle', { eventId, enabled })
  }

  // Approve a question
  const approveQuestion = (questionId) => {
    socketRef.current?.emit('qa:approve', { eventId, questionId })
  }

  // Reject a question
  const rejectQuestion = (questionId) => {
    socketRef.current?.emit('qa:reject', { eventId, questionId })
  }

  // Feature a question (show on display)
  const featureQuestion = (questionId) => {
    socketRef.current?.emit('qa:feature', { eventId, questionId })
  }

  // Unfeature a question
  const unfeatureQuestion = (questionId) => {
    socketRef.current?.emit('qa:unfeature', { eventId, questionId })
  }

  // Delete a question
  const deleteQuestion = (questionId) => {
    socketRef.current?.emit('qa:delete', { eventId, questionId })
  }

  // Clear all questions
  const clearAllQuestions = () => {
    if (confirm('Are you sure you want to clear all questions?')) {
      socketRef.current?.emit('qa:clear-all', { eventId })
    }
  }

  // Get filtered questions
  const getFilteredQuestions = () => {
    if (qaFilter === 'all') return questions
    return questions.filter(q => q.status === qaFilter)
  }

  // Get question counts by status
  const getQuestionCounts = () => {
    return {
      pending: questions.filter(q => q.status === 'pending').length,
      approved: questions.filter(q => q.status === 'approved').length,
      featured: questions.filter(q => q.status === 'featured').length,
      rejected: questions.filter(q => q.status === 'rejected').length,
      total: questions.length
    }
  }

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

  // ============================================
  // Timer Functions
  // ============================================

  const createTimer = () => {
    if (!newTimerName.trim()) {
      alert('Please enter a timer name')
      return
    }

    const totalSeconds = (newTimerMinutes * 60) + newTimerSeconds
    if (newTimerType === 'countdown' && totalSeconds < 1) {
      alert('Please set a duration of at least 1 second')
      return
    }

    socketRef.current?.emit('timer:create', {
      eventId,
      name: newTimerName.trim(),
      type: newTimerType,
      durationSeconds: totalSeconds
    })

    // Reset form
    setNewTimerName('')
    setNewTimerType('countdown')
    setNewTimerMinutes(5)
    setNewTimerSeconds(0)
    setShowTimerForm(false)
  }

  const startTimer = (timerId) => {
    socketRef.current?.emit('timer:start', { eventId, timerId })
  }

  const pauseTimer = (timerId) => {
    socketRef.current?.emit('timer:pause', { eventId, timerId })
  }

  const resumeTimer = (timerId) => {
    socketRef.current?.emit('timer:resume', { eventId, timerId })
  }

  const resetTimer = (timerId) => {
    socketRef.current?.emit('timer:reset', { eventId, timerId })
  }

  const deleteTimer = (timerId) => {
    if (confirm('Delete this timer?')) {
      socketRef.current?.emit('timer:delete', { eventId, timerId })
    }
  }

  // Format time for display (mm:ss or hh:mm:ss)
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

  // Get individual polls (not in any bundle)
  const individualPolls = polls.filter(p => !p.bundleId)

  // Render poll card
  const renderPollCard = (poll, inBundle = false) => (
    <div
      key={poll.id}
      className={`poll-card ${draggedPollId === poll.id ? 'dragging' : ''}`}
      draggable={poll.status === 'ready' && !poll.bundleId}
      onDragStart={(e) => handleDragStart(e, poll.id)}
      onDragEnd={handleDragEnd}
    >
      <div className="poll-card-header">
        <span
          className="poll-status-badge"
          style={{ backgroundColor: getStatusColor(poll.status) }}
        >
          {poll.status.toUpperCase()}
        </span>
        <span className="poll-question">{poll.question}</span>
        {poll.status === 'ready' && !poll.bundleId && (
          <span className="drag-hint" title="Drag to add to a bundle">⋮⋮</span>
        )}
      </div>

      <div className="poll-options-preview">
        {poll.options.map((opt, idx) => {
          const votes = poll.results?.voteCounts?.[opt.id] || 0
          const total = poll.results?.totalVotes || 0
          const percentage = total > 0 ? Math.round((votes / total) * 100) : 0

          return (
            <div key={opt.id} className={`poll-option-row ${opt.isCorrect ? 'correct' : ''}`}>
              <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
              <span className="option-text">{opt.text}</span>
              {opt.isCorrect && <span className="correct-indicator">✓</span>}
              {poll.status !== 'ready' && (
                <span className="option-votes">{votes} ({percentage}%)</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Poll settings badges */}
      <div className="poll-settings-badges">
        {poll.allowMultiple && <span className="poll-badge">Multi-select</span>}
        {poll.liveResults && <span className="poll-badge">Live results</span>}
      </div>

      {poll.status !== 'ready' && (
        <div className="poll-total-votes">
          Total votes: {poll.results?.totalVotes || 0}
        </div>
      )}

      {poll.status === 'ready' && (
        <div className="poll-actions">
          {inBundle ? (
            <button
              className="poll-action-btn secondary"
              onClick={() => removePollFromBundle(poll.bundleId, poll.id)}
            >
              Remove from bundle
            </button>
          ) : null}
          <button
            className="poll-action-btn delete"
            onClick={() => deletePoll(poll.id)}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )

  const handleLogout = async () => {
    const { error } = await signOut()
    if (!error) {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      navigate('/login')
    }
  }

  return (
    <div className="producer-container">
      <header className="producer-header">
        <div className="producer-header-left">
          <h1 className="producer-title">Producer Panel</h1>
          <div className="producer-status">
            <span className={`status-indicator ${connected ? 'connected' : ''}`}></span>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </header>

      {authError && (
        <div className="auth-error">
          ⚠️ {authError}
        </div>
      )}

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

        {/* Unified Polls Section */}
        <section className="producer-section">
          <button
            className="section-header-btn"
            onClick={() => setPollSectionOpen(!pollSectionOpen)}
          >
            <h2 className="section-title">Polls</h2>
            <span className={`section-chevron ${pollSectionOpen ? 'open' : ''}`}>
              ▼
            </span>
          </button>

          <div className={`collapsible-content ${pollSectionOpen ? 'open' : ''}`}>
            {/* Action Buttons - shown when no form is open */}
            {!showPollForm && !showBundleForm && (
              <div className="poll-action-buttons">
                <button
                  className="primary-action-btn poll"
                  onClick={() => {
                    setShowPollForm(true)
                    setTargetBundleId(null)
                  }}
                >
                  <span className="action-icon">+</span>
                  Create Poll
                </button>
                <button
                  className="primary-action-btn bundle"
                  onClick={() => setShowBundleForm(true)}
                >
                  <span className="action-icon">+</span>
                  Create Bundle
                </button>
              </div>
            )}

            {/* Create New Poll Form - hidden by default */}
            {showPollForm && !inlinePollBundleId && (
              <div className="poll-form">
                <div className="form-header-row">
                  <h3 className="form-title">Create New Poll</h3>
                  <button className="form-close-btn" onClick={closePollForm}>×</button>
                </div>

                <div className="form-group">
                  <label className="form-label">Question</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter your poll question..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Options <span className="form-hint">(click checkmark to mark correct answer)</span></label>
                  {newOptions.map((option, index) => (
                    <div key={index} className="option-row">
                      <input
                        type="text"
                        className="form-input option-input"
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                      />
                      <button
                        type="button"
                        className={`correct-answer-btn ${correctAnswerIndex === index ? 'correct' : ''}`}
                        onClick={() => setCorrectAnswerIndex(correctAnswerIndex === index ? null : index)}
                        title="Mark as correct answer"
                      >
                        ✓
                      </button>
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

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={allowMultiple}
                        onChange={(e) => setAllowMultiple(e.target.checked)}
                      />
                      Allow multiple selections
                    </label>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={liveResults}
                        onChange={(e) => setLiveResults(e.target.checked)}
                      />
                      Live result updates
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

                <div className="form-buttons">
                  <button className="create-poll-btn" onClick={createPoll}>
                    Create Poll
                  </button>
                  <button className="cancel-btn" onClick={closePollForm}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Create Bundle Form - hidden by default */}
            {showBundleForm && (
              <div className="poll-form bundle-form">
                <div className="form-header-row">
                  <h3 className="form-title">Create New Bundle</h3>
                  <button
                    className="form-close-btn"
                    onClick={() => {
                      setShowBundleForm(false)
                      setNewBundleName('')
                    }}
                  >×</button>
                </div>

                <div className="form-group">
                  <label className="form-label">Bundle Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Trivia Round 1"
                    value={newBundleName}
                    onChange={(e) => setNewBundleName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createBundle()}
                    autoFocus
                  />
                </div>

                <div className="form-buttons">
                  <button className="create-poll-btn" onClick={createBundle}>
                    Create Bundle
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setShowBundleForm(false)
                      setNewBundleName('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Bundles List */}
            {bundles.length > 0 && (
              <div className="bundles-list">
                <h3 className="subsection-title">Bundles</h3>
                {bundles.map(bundle => (
                  <div
                    key={bundle.id}
                    className={`bundle-card ${bundle.status} ${draggedPollId ? 'drop-target' : ''}`}
                    onDragOver={bundle.status === 'ready' ? handleDragOver : undefined}
                    onDrop={bundle.status === 'ready' ? (e) => handleDropOnBundle(e, bundle.id) : undefined}
                  >
                    <div
                      className="bundle-header"
                      onClick={() => toggleBundleExpanded(bundle.id)}
                    >
                      <span className="bundle-status-badge">{bundle.status.toUpperCase()}</span>
                      <span className="bundle-name">{bundle.name}</span>
                      <span className="bundle-poll-count">{bundle.pollIds.length} polls</span>
                      <span className="bundle-chevron">{expandedBundles.has(bundle.id) ? '▼' : '▶'}</span>
                    </div>

                    {expandedBundles.has(bundle.id) && (
                      <div className="bundle-content">
                        {/* Polls in bundle */}
                        {bundle.pollIds.length === 0 && inlinePollBundleId !== bundle.id ? (
                          <p className="bundle-empty-message">
                            {bundle.status === 'ready'
                              ? 'No polls yet. Add a poll below.'
                              : 'No polls in this bundle'}
                          </p>
                        ) : (
                          <div className="bundle-polls-list">
                            {bundle.pollIds.map((pollId, idx) => {
                              const poll = polls.find(p => p.id === pollId)
                              if (!poll) return null
                              return (
                                <div key={pollId} className="bundle-poll-wrapper">
                                  <span className="bundle-poll-index">{idx + 1}</span>
                                  {renderPollCard(poll, true)}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Inline poll creation form */}
                        {inlinePollBundleId === bundle.id && (
                          <div className="inline-poll-form">
                            <div className="form-group">
                              <label className="form-label">Question</label>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Enter your poll question..."
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                autoFocus
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label">Options <span className="form-hint">(click checkmark to mark correct answer)</span></label>
                              {newOptions.map((option, index) => (
                                <div key={index} className="option-row">
                                  <input
                                    type="text"
                                    className="form-input option-input"
                                    placeholder={`Option ${index + 1}`}
                                    value={option}
                                    onChange={(e) => updateOption(index, e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    className={`correct-answer-btn ${correctAnswerIndex === index ? 'correct' : ''}`}
                                    onClick={() => setCorrectAnswerIndex(correctAnswerIndex === index ? null : index)}
                                    title="Mark as correct answer"
                                  >
                                    ✓
                                  </button>
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

                            <div className="form-row compact">
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={allowMultiple}
                                  onChange={(e) => setAllowMultiple(e.target.checked)}
                                />
                                Multi-select
                              </label>
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={liveResults}
                                  onChange={(e) => setLiveResults(e.target.checked)}
                                />
                                Live results
                              </label>
                            </div>

                            <div className="form-buttons">
                              <button className="create-poll-btn small" onClick={createPoll}>
                                Add Poll
                              </button>
                              <button className="cancel-btn small" onClick={cancelInlinePollCreation}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Add poll button (when not currently adding) */}
                        {bundle.status === 'ready' && inlinePollBundleId !== bundle.id && (
                          <button
                            className="add-poll-to-bundle-btn"
                            onClick={() => startInlinePollCreation(bundle.id)}
                          >
                            + Add Poll
                          </button>
                        )}

                        {/* Quick add existing poll */}
                        {bundle.status === 'ready' && polls.some(p => p.status === 'ready' && !p.bundleId) && (
                          <select
                            className="form-select bundle-add-select"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                addPollToBundle(bundle.id, e.target.value)
                              }
                            }}
                          >
                            <option value="">+ Add existing poll...</option>
                            {polls
                              .filter(p => p.status === 'ready' && !p.bundleId)
                              .map(p => (
                                <option key={p.id} value={p.id}>{p.question}</option>
                              ))
                            }
                          </select>
                        )}

                        {/* Bundle actions */}
                        {bundle.status === 'ready' && (
                          <div className="bundle-actions">
                            <button
                              className="poll-action-btn delete"
                              onClick={() => deleteBundle(bundle.id)}
                            >
                              Delete Bundle
                            </button>
                          </div>
                        )}

                        {bundle.status !== 'ready' && (
                          <p className="bundle-locked-message">
                            {bundle.status === 'active' ? 'Bundle is currently active - managed by A/V Tech' : 'Bundle completed'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Individual Polls */}
            {individualPolls.length > 0 && (
              <div className="individual-polls-section">
                <h3 className="subsection-title">Individual Polls</h3>
                <div className="polls-list">
                  {individualPolls.map(poll => renderPollCard(poll, false))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Timers Section */}
        <section className="producer-section">
          <button
            className="section-header-btn"
            onClick={() => setTimerSectionOpen(!timerSectionOpen)}
          >
            <h2 className="section-title">Timers & Countdowns</h2>
            <span className={`section-chevron ${timerSectionOpen ? 'open' : ''}`}>
              ▼
            </span>
          </button>

          <div className={`collapsible-content ${timerSectionOpen ? 'open' : ''}`}>
            {/* Create Timer Button */}
            {!showTimerForm && (
              <button
                className="primary-action-btn poll"
                onClick={() => setShowTimerForm(true)}
              >
                <span className="action-icon">+</span>
                Create Timer
              </button>
            )}

            {/* Create Timer Form */}
            {showTimerForm && (
              <div className="poll-form">
                <div className="form-header-row">
                  <h3 className="form-title">Create Timer</h3>
                  <button className="form-close-btn" onClick={() => setShowTimerForm(false)}>×</button>
                </div>

                <div className="form-group">
                  <label className="form-label">Timer Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Break, Session 1, Q&A Time"
                    value={newTimerName}
                    onChange={(e) => setNewTimerName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Type</label>
                  <div className="timer-type-options">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="timerType"
                        value="countdown"
                        checked={newTimerType === 'countdown'}
                        onChange={(e) => setNewTimerType(e.target.value)}
                      />
                      <span>Countdown</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="timerType"
                        value="stopwatch"
                        checked={newTimerType === 'stopwatch'}
                        onChange={(e) => setNewTimerType(e.target.value)}
                      />
                      <span>Stopwatch</span>
                    </label>
                  </div>
                </div>

                {newTimerType === 'countdown' && (
                  <div className="form-group">
                    <label className="form-label">Duration</label>
                    <div className="timer-duration-inputs">
                      <div className="duration-field">
                        <input
                          type="number"
                          className="form-input duration-input"
                          min="0"
                          max="59"
                          value={newTimerMinutes}
                          onChange={(e) => setNewTimerMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                        />
                        <span className="duration-label">min</span>
                      </div>
                      <span className="duration-separator">:</span>
                      <div className="duration-field">
                        <input
                          type="number"
                          className="form-input duration-input"
                          min="0"
                          max="59"
                          value={newTimerSeconds}
                          onChange={(e) => setNewTimerSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                        />
                        <span className="duration-label">sec</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-buttons">
                  <button className="create-poll-btn" onClick={createTimer}>
                    Create Timer
                  </button>
                  <button className="cancel-btn" onClick={() => setShowTimerForm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Timers List */}
            {timers.length > 0 && (
              <div className="timers-list">
                {timers.map(timer => (
                  <div key={timer.id} className="poll-card timer-card">
                    <div className="poll-card-header">
                      <span
                        className="poll-status-badge"
                        style={{ backgroundColor: getStatusColor(timer.status) }}
                      >
                        {timer.status.toUpperCase()}
                      </span>
                      <span className="poll-question">{timer.name}</span>
                    </div>

                    <div className="timer-display-row">
                      <span className="timer-type-badge">
                        {timer.type === 'countdown' ? '⏱️ Countdown' : '⏲️ Stopwatch'}
                      </span>
                      <span className={`timer-time timer-live ${timer.status === 'running' ? 'running' : ''}`}>
                        {formatTimerDisplay(timer)}
                      </span>
                    </div>

                    <div className="poll-actions timer-actions">
                      {timer.status === 'ready' && (
                        <>
                          <button
                            className="poll-action-btn primary"
                            onClick={() => startTimer(timer.id)}
                          >
                            ▶️ Start
                          </button>
                          <button
                            className="poll-action-btn delete"
                            onClick={() => deleteTimer(timer.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}

                      {timer.status === 'running' && (
                        <>
                          <button
                            className="poll-action-btn secondary"
                            onClick={() => pauseTimer(timer.id)}
                          >
                            ⏸️ Pause
                          </button>
                          <button
                            className="poll-action-btn secondary"
                            onClick={() => resetTimer(timer.id)}
                          >
                            🔄 Reset
                          </button>
                        </>
                      )}

                      {timer.status === 'paused' && (
                        <>
                          <button
                            className="poll-action-btn primary"
                            onClick={() => resumeTimer(timer.id)}
                          >
                            ▶️ Resume
                          </button>
                          <button
                            className="poll-action-btn secondary"
                            onClick={() => resetTimer(timer.id)}
                          >
                            🔄 Reset
                          </button>
                        </>
                      )}

                      {timer.status === 'finished' && (
                        <>
                          <button
                            className="poll-action-btn secondary"
                            onClick={() => resetTimer(timer.id)}
                          >
                            🔄 Reset
                          </button>
                          <button
                            className="poll-action-btn delete"
                            onClick={() => deleteTimer(timer.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>

                    {timer.showOnDisplay && (
                      <div className="timer-on-display-badge">
                        📺 On Display
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {timers.length === 0 && !showTimerForm && (
              <p className="no-items-message">No timers created yet.</p>
            )}
          </div>
        </section>

        {/* Emoji Packs Section */}
        <section className="producer-section">
          <button
            className="section-header-btn"
            onClick={() => setEmojiSectionOpen(!emojiSectionOpen)}
          >
            <h2 className="section-title">Emoji Packs</h2>
            <span className={`section-chevron ${emojiSectionOpen ? 'open' : ''}`}>
              ▼
            </span>
          </button>

          <div className={`collapsible-content ${emojiSectionOpen ? 'open' : ''}`}>
            {/* Pack Builder Modal */}
            {showPackBuilder && (
              <div className="pack-builder">
                <div className="form-header-row">
                  <h3 className="form-title">
                    {editingPackId ? 'Edit Emoji Pack' : 'Create Emoji Pack'}
                  </h3>
                  <button className="form-close-btn" onClick={cancelPackBuilder}>×</button>
                </div>

                <div className="form-group">
                  <label className="form-label">Pack Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., My Custom Pack"
                    value={newPackName}
                    onChange={(e) => setNewPackName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Emojis ({packEmojis.length}/20)
                  </label>

                  {/* Selected emojis */}
                  <div className="pack-emojis-preview">
                    {packEmojis.length === 0 ? (
                      <p className="pack-empty-hint">Click emojis below or upload images to add</p>
                    ) : (
                      packEmojis.map((emoji, index) => (
                        <div key={index} className="pack-emoji-item">
                          {emoji.startsWith('data:') ? (
                            <img src={emoji} alt="custom" className="pack-emoji-img" />
                          ) : (
                            <span className="pack-emoji-text">{emoji}</span>
                          )}
                          <button
                            className="pack-emoji-remove"
                            onClick={() => removeEmojiFromPack(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Upload custom image */}
                  <div className="pack-upload-row">
                    <label className="pack-upload-btn">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                      📷 Upload Custom Image
                    </label>
                    <button
                      className={`pack-picker-toggle ${emojiPickerOpen ? 'active' : ''}`}
                      onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                    >
                      {emojiPickerOpen ? '▲ Hide Emoji Picker' : '▼ Show Emoji Picker'}
                    </button>
                  </div>

                  {/* Emoji picker grid */}
                  {emojiPickerOpen && (
                    <div className="emoji-picker-grid">
                      {commonEmojis.map((emoji, index) => (
                        <button
                          key={index}
                          className="emoji-picker-item"
                          onClick={() => addEmojiToPack(emoji)}
                          disabled={packEmojis.length >= 20}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-buttons">
                  <button className="create-poll-btn" onClick={savePack}>
                    {editingPackId ? 'Save Changes' : 'Create Pack'}
                  </button>
                  <button className="cancel-btn" onClick={cancelPackBuilder}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Create Pack Button */}
            {!showPackBuilder && (
              <button className="primary-action-btn poll" onClick={startNewPack}>
                <span className="action-icon">+</span>
                Create Custom Pack
              </button>
            )}

            {/* Templates */}
            <div className="emoji-packs-list">
              <h3 className="subsection-title">Templates</h3>
              {emojiTemplates.map(template => (
                <div
                  key={template.id}
                  className={`emoji-pack-card ${activeEmojiPackId === template.id ? 'active' : ''}`}
                >
                  <div className="emoji-pack-header">
                    <span className="emoji-pack-name">{template.name}</span>
                    {activeEmojiPackId === template.id && (
                      <span className="emoji-pack-active-badge">ACTIVE</span>
                    )}
                  </div>
                  <div className="emoji-pack-preview">
                    {template.emojis.slice(0, 8).map((emoji, idx) => (
                      <span key={idx} className="emoji-preview-item">{emoji}</span>
                    ))}
                    {template.emojis.length > 8 && (
                      <span className="emoji-preview-more">+{template.emojis.length - 8}</span>
                    )}
                  </div>
                  <div className="emoji-pack-actions">
                    {activeEmojiPackId !== template.id && (
                      <button
                        className="poll-action-btn primary"
                        onClick={() => setActiveEmojiPack(template.id)}
                      >
                        Use This Pack
                      </button>
                    )}
                    <button
                      className="poll-action-btn secondary"
                      onClick={() => copyTemplateToCustom(template)}
                    >
                      Copy & Customize
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Packs */}
            {customEmojiPacks.length > 0 && (
              <div className="emoji-packs-list">
                <h3 className="subsection-title">Custom Packs</h3>
                {customEmojiPacks.map(pack => (
                  <div
                    key={pack.id}
                    className={`emoji-pack-card ${activeEmojiPackId === pack.id ? 'active' : ''}`}
                  >
                    <div className="emoji-pack-header">
                      <span className="emoji-pack-name">{pack.name}</span>
                      {activeEmojiPackId === pack.id && (
                        <span className="emoji-pack-active-badge">ACTIVE</span>
                      )}
                    </div>
                    <div className="emoji-pack-preview">
                      {pack.emojis.slice(0, 8).map((emoji, idx) => (
                        emoji.startsWith('data:') ? (
                          <img key={idx} src={emoji} alt="" className="emoji-preview-img" />
                        ) : (
                          <span key={idx} className="emoji-preview-item">{emoji}</span>
                        )
                      ))}
                      {pack.emojis.length > 8 && (
                        <span className="emoji-preview-more">+{pack.emojis.length - 8}</span>
                      )}
                    </div>
                    <div className="emoji-pack-actions">
                      {activeEmojiPackId !== pack.id && (
                        <button
                          className="poll-action-btn primary"
                          onClick={() => setActiveEmojiPack(pack.id)}
                        >
                          Use This Pack
                        </button>
                      )}
                      <button
                        className="poll-action-btn secondary"
                        onClick={() => startEditPack(pack)}
                      >
                        Edit
                      </button>
                      <button
                        className="poll-action-btn delete"
                        onClick={() => deletePack(pack.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Q&A Moderation Section */}
        <section className="producer-section">
          <button
            className="section-header-btn"
            onClick={() => setQaSectionOpen(!qaSectionOpen)}
          >
            <h2 className="section-title">
              Q&A Moderation
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
                className={`qa-filter-tab ${qaFilter === 'rejected' ? 'active' : ''}`}
                onClick={() => setQaFilter('rejected')}
              >
                Rejected
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
                  {qaFilter === 'rejected' && 'No rejected questions'}
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

            {/* Clear All Button */}
            {questions.length > 0 && (
              <button className="qa-clear-all-btn" onClick={clearAllQuestions}>
                Clear All Questions
              </button>
            )}
          </div>
        </section>

        {/* Display URLs */}
        <section className="producer-section">
          <h2 className="section-title">Event URLs</h2>
          <div className="url-list">
            <div className="url-item">
              <span className="url-label">Audience Page:</span>
              <code className="url-code">
                {window.location.origin}/audience/{eventId}
              </code>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(`${window.location.origin}/audience/${eventId}`)}
              >
                Copy
              </button>
            </div>

            <div className="url-item">
              <span className="url-label">Display Output:</span>
              <code className="url-code">
                {window.location.origin}/display?eventId={eventId}
              </code>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(`${window.location.origin}/display?eventId=${eventId}`)}
              >
                Copy
              </button>
            </div>

            <div className="url-item password-protected">
              <span className="url-label">
                A/V Tech Panel:
                <span className="password-badge">🔒 Password Protected</span>
              </span>
              <code className="url-code">
                {window.location.origin}/avtech/{eventId}
              </code>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(`${window.location.origin}/avtech/${eventId}`)}
              >
                Copy
              </button>

              <div className="password-info">
                <span>Current Password: <code className="password-display">{avtechPassword}</code></span>
                <button
                  className="change-password-btn"
                  onClick={() => setShowPasswordModal(true)}
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>Set A/V Tech Password</h3>
              <p>Password must be 4-20 alphanumeric characters</p>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                maxLength={20}
              />
              <div className="modal-buttons">
                <button onClick={handlePasswordChange}>Save</button>
                <button onClick={() => setShowPasswordModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Producer
