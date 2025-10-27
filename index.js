const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express(); // Express is a web framework that simplifies server creation
const server = http.createServer(app); // Create HTTP server
const io = new Server(server); // Attach Socket.io to the server

const PORT = 3000;// Port number for the server

// Serve static files from the current directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Message history feature ---
const msgHistoryKept = true; // Set to false to disable message history
let msgHistory = []; // Array to store message history

// Listen for Socket.io connections
io.on('connection', (socket) => {
  console.log('A user connected');

  // Send message history to the new client if enabled
  if (msgHistoryKept) {
    socket.emit('message history', msgHistory);
  }

  // Listen for chat messages from this client
  socket.on('chat message', (data) => {
    // Store message if enabled
    if (msgHistoryKept) {
      msgHistory.push(data);
      // Limit history size eg to last 100 messages
      if (msgHistory.length > 100) {
        msgHistory.shift();
      }
    }
    // Broadcast the message to all clients
    io.emit('chat message', data);
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});