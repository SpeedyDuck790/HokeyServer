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

// Listen for Socket.io connections
// When a client connects
// Set up event listeners for that client
// Broadcast messages to all connected clients
io.on('connection', (socket) => {
    console.log('A user connected');

  // Listen for chat messages from this client
  socket.on('chat message', (data) => {
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