import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import './App.css'

const socket = io('http://localhost:3001')

function App() {
  const [connected, setConnected] = useState(false)
  const [serverResponse, setServerResponse] = useState(null)

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    socket.on('test-response', (data) => {
      console.log('Received from server:', data)
      setServerResponse(data)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('test-response')
    }
  }, [])

  const sendTestMessage = () => {
    socket.emit('test', { message: 'Hello from React!', timestamp: new Date().toISOString() })
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Event Interactions</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Server Status: </strong>
        <span style={{ color: connected ? 'green' : 'red' }}>
          {connected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>

      <button onClick={sendTestMessage} disabled={!connected}>
        Send Test Message to Server
      </button>

      {serverResponse && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
          <strong>Server Response:</strong>
          <pre>{JSON.stringify(serverResponse, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default App