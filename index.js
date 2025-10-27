const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const { exec } = require('child_process');

const app = express(); // Express is a web framework that simplifies server creation
const server = http.createServer(app); // Create HTTP server
const io = new Server(server); // Attach Socket.io to the server

const PORT = process.env.PORT || 8080; // Use Render's assigned port or default to 8080

// Serve static files from the assets directory (for CSS, images, etc.)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Message history feature ---
const msgHistoryKept = true; // Set to false to disable message history
let msgHistory = []; // Array to store message history

// --- User tracking for online users ---
let onlineUsers = {};

io.on('connection', (socket) => {
  console.log('A user connected');

  // Listen for user registration
  socket.on('register user', (username) => {//This listens for a message called 'register user' from a client
// Each connected client gets a unique ID (socket.id).
// This line saves the username for that client’s ID in the onlineUsers object.
// Example: If two users join, onlineUsers might look like { 'abc123': 'Alice', 'def456': 'Bob' }.
    onlineUsers[socket.id] = username;
    io.emit('user list', Object.values(onlineUsers));// Broadcast updated user list
  });

  // Send message history to the new client if enabled
  if (msgHistoryKept) {
    socket.emit('message history', msgHistory);
  }

  // Listen for chat messages from this client
  socket.on('chat message', (data) => {
    // Server-side validation
    if (
        typeof data.userMsg !== 'string' ||
        !data.userMsg.trim() ||
        data.userMsg.length > 200
    ) {
        return; // Ignore invalid messages
    }
    // Sanitize
    data.userMsg = data.userMsg.replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
    delete onlineUsers[socket.id];
    io.emit('user list', Object.values(onlineUsers));
  });
});

// Start the server
const isLocal = process.argv[2] !== 'ip';
const isRender = !!process.env.RENDER;
const host = isRender ? '0.0.0.0' : (isLocal ? 'localhost' : '0.0.0.0');

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Add firewall rule for Windows if running in IP mode
function addFirewallRule(port) {
  const cmd = `netsh advfirewall firewall add rule name=\"Node.js Chat Port ${port}\" dir=in action=allow protocol=TCP localport=${port}`;
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.log('Firewall rule may require admin rights or already exists.');
    } else {
      console.log('Firewall rule added:', stdout);
    }
  });
}

if (process.platform === 'win32' && !isLocal) {
  addFirewallRule(PORT);
}

server.listen(PORT, host, () => {
  const localIP = getLocalIP();
  console.log(`Server running on http://${host}:${PORT}`);
  if (!isLocal) {
    console.log(`Network access: http://${localIP}:${PORT}`);
  }
});