require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

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

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Event Interactions server is running',
    timestamp: new Date().toISOString()
  });
});

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
  console.log('Server running on http://localhost:' + PORT);
  console.log('Socket.IO ready for connections');
});