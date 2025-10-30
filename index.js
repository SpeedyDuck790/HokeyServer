require('dotenv').config(); // Load environment variables
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const { exec } = require('child_process');

// Import database services
const dbConnection = require('./database/connection');
const chatService = require('./database/services/chatService');

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
let msgHistory = []; // Array to store message history (in-memory backup)

// --- Database toggle ---
// Check for 'db' argument: node index.js db
// Or use USE_DATABASE environment variable (default: false)
const hasDbArg = process.argv.includes('db');
const USE_DATABASE = hasDbArg ? true : (process.env.USE_DATABASE === 'true');
let isDatabaseConnected = false;

// --- User tracking for online users ---
let onlineUsers = {};

// Initialize database connection
async function initializeDatabase() {
  if (!USE_DATABASE) {
    console.log('📝 Database disabled - using memory-only mode');
    return;
  }

  try {
    await dbConnection.connect();
    isDatabaseConnected = true;
    console.log('📊 Database service initialized');
    
    // Load recent messages from database if history is enabled
    if (msgHistoryKept) {
      const recentMessages = await chatService.getLimitedMessages('global', 50);
      msgHistory = recentMessages.map(msg => ({
        username: msg.username,
        userMsg: msg.message,
        timestamp: msg.timestamp
      }));
      console.log(`📜 Loaded ${msgHistory.length} recent messages from database`);
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.log('⚠️ Running in memory-only mode');
    isDatabaseConnected = false;
  }
}

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
  socket.on('chat message', async (data) => {
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
    
    // Add timestamp if not present
    if (!data.timestamp) {
      data.timestamp = new Date().toISOString();
    }
    
    // Store message in database if enabled
    if (msgHistoryKept) {
      // Try to save to database if connected
      if (USE_DATABASE && isDatabaseConnected) {
        try {
          await chatService.saveMessage({
            username: data.username,
            message: data.userMsg,
            room: 'global'
          });
          console.log(`💾 Message saved to database: ${data.username}`);
        } catch (error) {
          console.error('❌ Failed to save message to database:', error.message);
          // Fall back to memory-only if database fails
          isDatabaseConnected = false;
        }
      }
      
      // Always store in memory as backup
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

// Initialize database before starting server
async function startServer() {
  await initializeDatabase();
  
  server.listen(PORT, host, () => {
    const localIP = getLocalIP();
    console.log(`Server running on http://${host}:${PORT}`);
    if (!isLocal) {
      console.log(`Network access: http://${localIP}:${PORT}`);
    }
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  try {
    await dbConnection.disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  try {
    await dbConnection.disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
  }
  process.exit(0);
});

// Start the application
startServer().catch(error => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});