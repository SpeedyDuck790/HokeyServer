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
const roomService = require('./database/services/roomService');

// Import controllers
const roomController = require('./controllers/roomController');

const app = express(); // Express is a web framework that simplifies server creation
const server = http.createServer(app); // Create HTTP server
const io = new Server(server); // Attach Socket.io to the server

const PORT = process.env.PORT || 8080; // Use Render's assigned port or default to 8080

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the assets directory (for CSS, images, etc.)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve main chat page (global chat with side menu) at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'chat.html'));
});

// Keep lobby as separate page if needed
app.get('/lobby', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'lobby.html'));
});

// API Routes for rooms
// Live endpoint must come BEFORE the generic /api/rooms to match first
app.get('/api/rooms/live', async (req, res) => {
  try {
    const roomService = require('./database/services/roomService');
    const rooms = await roomService.getAllPublicRooms();
    
    // Add real-time online counts from memory
    const roomsWithOnline = rooms.map(room => {
      const roomData = room.toObject ? room.toObject() : room;
      const onlineCount = onlineUsersByRoom[room.name] ? Object.keys(onlineUsersByRoom[room.name]).length : 0;
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

io.on('connection', (socket) => {
  console.log('A user connected');
  let currentRoom = null;
  let currentUsername = null;

  // Listen for user joining a room
  socket.on('join room', async (data) => {
    const { room, username, password } = data;

    // Verify password if room requires it (do not allow empty string)
    if (USE_DATABASE && isDatabaseConnected) {
      try {
        const roomData = await roomService.getRoomByName(room);
        if (roomData && roomData.password) {
          if (!password || password.trim() === "") {
            socket.emit('room error', { message: 'Password required' });
            return;
          }
          const isValid = await roomService.verifyRoomPassword(room, password);
          if (!isValid) {
            socket.emit('room error', { message: 'Incorrect password' });
            return;
          }
        }
      } catch (error) {
        console.error('Error verifying room access:', error.message);
      }
    }

    // If user is switching rooms, remove from old room first
    if (currentRoom && currentRoom !== room) {
      // Leave the old socket.io room
      socket.leave(currentRoom);
      
      // Remove from old room in database
      if (USE_DATABASE && isDatabaseConnected) {
        try {
          await roomService.removeUserFromRoom(currentRoom, socket.id);
        } catch (error) {
          console.error('Failed to remove user from old room:', error.message);
        }
      }
      
      // Remove from memory tracking
      if (onlineUsersByRoom[currentRoom]) {
        delete onlineUsersByRoom[currentRoom][socket.id];
        
        // Broadcast updated user list to old room
        io.to(currentRoom).emit('user list', {
          room: currentRoom,
          users: Object.values(onlineUsersByRoom[currentRoom])
        });
      }
      
      console.log(`Leave|${currentUsername}|${currentRoom}|`);
    }

    currentRoom = room;
    currentUsername = username;

    // Join the socket.io room
    socket.join(room);
    console.log(`Join|${username}|${room}|`);

    // Add user to room in database if enabled
    if (USE_DATABASE && isDatabaseConnected) {
      try {
        await roomService.addUserToRoom(room, socket.id, username);
      } catch (error) {
        console.error('Failed to add user to room in database:', error.message);
      }
    }

    // Track user in memory
    if (!onlineUsersByRoom[room]) {
      onlineUsersByRoom[room] = {};
    }
    onlineUsersByRoom[room][socket.id] = username;

    // Broadcast updated user list to room
    io.to(room).emit('user list', {
      room: room,
      users: Object.values(onlineUsersByRoom[room])
    });

    // Send message history to the user if enabled
    if (msgHistoryKept) {
      const history = msgHistoryByRoom[room] || [];
      socket.emit('message history', history);
    }
  });

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
    
    // Ensure room is set
    if (!data.room) {
      data.room = currentRoom || 'global';
    }
    
    // Store message in database if enabled
    if (msgHistoryKept) {
      // Check if room wants messages persisted to database
      let shouldPersist = false; // Default to false (memory-only)
      if (USE_DATABASE && isDatabaseConnected) {
        try {
          const roomData = await roomService.getRoomByName(data.room);
          // Only persist if room explicitly says to persist (default rooms have persistMessages=true)
          shouldPersist = roomData && roomData.persistMessages === true;

          // Try to save to database if room allows it
          if (shouldPersist) {
            await chatService.saveMessage({
              username: data.username,
              message: data.userMsg,
              room: data.room
            });
            // Increment room message count
            await roomService.incrementMessageCount(data.room);
            console.log(`Msg saved|${data.username}|${data.room}|Db|`);
          } else {
            console.log(`Msg saved|${data.username}|${data.room}|NoDb|`);
          }
        } catch (error) {
          console.error('❌ Failed to save message to database:', error.message);
        }
      }
      
      // Always store in memory as backup
      if (!msgHistoryByRoom[data.room]) {
        msgHistoryByRoom[data.room] = [];
      }
      msgHistoryByRoom[data.room].push(data);
      // Limit history size to last 100 messages per room
      if (msgHistoryByRoom[data.room].length > 100) {
        msgHistoryByRoom[data.room].shift();
      }
    }
    
    // Broadcast the message to all clients in the room
    io.to(data.room).emit('chat message', data);
  });

  // Handle client disconnection
  socket.on('disconnect', async () => {
    if (currentRoom && onlineUsersByRoom[currentRoom]) {
      // Remove user from database if enabled
      if (USE_DATABASE && isDatabaseConnected) {
        try {
          await roomService.removeUserFromRoom(currentRoom, socket.id);
        } catch (error) {
          console.error('Failed to remove user from room in database:', error.message);
        }
      }

      // Remove from memory
      delete onlineUsersByRoom[currentRoom][socket.id];

      // Broadcast updated user list to room
      io.to(currentRoom).emit('user list', {
        room: currentRoom,
        users: Object.values(onlineUsersByRoom[currentRoom])
      });

      // Clean, compact leave log
      console.log(`Leave|${currentUsername}|${currentRoom}|`);
    }
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