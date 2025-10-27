const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Serve static files from the current directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Listen for Socket.io connections
// When a client connects
// Set up event listeners for that client
// Broadcast messages to all connected clients
io.on('connection', (socket) => {
    console.log('A user connected');

  // Listen for chat messages from this client
  socket.on('chat message', (msg) => {
    // Broadcast the message to all clients
    io.emit('chat message', msg);
  });
  
  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});