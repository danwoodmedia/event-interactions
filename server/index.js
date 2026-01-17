import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { supabase } from './lib/supabase.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Event Interactions server is running',
    timestamp: new Date().toISOString()
  });
});

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    // Try to query the organizations table
    const { data, error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database connection error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message
      });
    }

    res.json({
      status: 'success',
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Unexpected error',
      error: err.message
    });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  socket.on('test', (data) => {
    console.log('Received test event:', data);
    socket.emit('test-response', { received: data, serverTime: new Date().toISOString() });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Socket.IO ready for connections');
  console.log('Supabase URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
  console.log('Supabase Service Key:', process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing');
});
