require('dotenv').config(); // Load environment variables
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const { exec } = require('child_process');

// Import database services
const dbConnection = require('./src/config/database');
const chatService = require('./src/services/chatService');
const roomService = require('./src/services/roomService');

// Import controllers
const roomController = require('./src/controllers/roomController');

const app = express(); // Express is a web framework that simplifies server creation
const server = http.createServer(app); // Create HTTP server
const io = new Server(server); // Attach Socket.io to the server

const PORT = process.env.PORT || 8080; // Use Render's assigned port or default to 8080

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the public directory (for CSS, JS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Serve main chat page (global chat with side menu) at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'views', 'chat.html'));
});

// Keep lobby as separate page if needed
app.get('/lobby', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'views', 'lobby.html'));
});

// API Routes for rooms
// Live endpoint must come BEFORE the generic /api/rooms to match first
app.get('/api/rooms/live', async (req, res) => {
  try {
    const roomService = require('./src/services/roomService');
    const rooms = await roomService.getAllPublicRooms();
    const socketHandlers = require('./src/sockets/socketHandlers');

    // Add real-time online counts from socket handler memory
    const onlineMap = socketHandlers.getOnlineUsersByRoom();
    const roomsWithOnline = rooms.map(room => {
      const roomData = room.toObject ? room.toObject() : room;
      const onlineCount = onlineMap[room.name] ? Object.keys(onlineMap[room.name]).length : 0;
      return {
        ...roomData,
        onlineCount: onlineCount
      };
    });

    res.json({
      success: true,
      rooms: roomsWithOnline
    });
  } catch (error) {
    console.error('Error fetching live rooms:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rooms'
    });
  }
});

app.get('/api/rooms', async (req, res) => {
  try {
    await roomController.getRooms(req, res);
  } catch (error) {
    // Error already handled in controller
  }
});

app.get('/api/rooms/:roomName', (req, res) => roomController.getRoom(req, res));
app.post('/api/rooms', (req, res) => roomController.createRoom(req, res));
app.put('/api/rooms/:roomName', (req, res) => roomController.updateRoom(req, res));
app.delete('/api/rooms/:roomName', (req, res) => roomController.deleteRoom(req, res));

// --- Message history feature ---
const msgHistoryKept = true; // Set to false to disable message history
let msgHistoryByRoom = {}; // Object to store message history per room (in-memory backup)

// --- Database toggle ---
// Check for 'db' argument: node index.js db
// Or use USE_DATABASE environment variable (default: false)
const hasDbArg = process.argv.includes('db');
const USE_DATABASE = hasDbArg ? true : (process.env.USE_DATABASE === 'true');
let isDatabaseConnected = false;

// --- User tracking for online users ---
let onlineUsersByRoom = {}; // Track users per room

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
    
    // Initialize default rooms
    await roomService.initializeDefaultRooms();
    
    // Load recent messages from database for all rooms if history is enabled
    if (msgHistoryKept) {
      const rooms = await roomService.getAllPublicRooms();
      for (const room of rooms) {
        const recentMessages = await chatService.getLimitedMessages(room.name, 50);
        msgHistoryByRoom[room.name] = recentMessages.map(msg => ({
          username: msg.username,
          userMsg: msg.message,
          timestamp: msg.timestamp,
          room: msg.room
        }));
        console.log(`📜 Loaded ${msgHistoryByRoom[room.name].length} messages for room: ${room.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.log('⚠️ Running in memory-only mode');
    isDatabaseConnected = false;
  }
}

const socketHandlers = require('./src/sockets/socketHandlers');

// Attach socket handlers (pass dynamic DB-state getter)
socketHandlers.attachSocketHandlers(io, {
  getIsDbConnected: () => isDatabaseConnected,
  msgHistoryKept,
  USE_DATABASE
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