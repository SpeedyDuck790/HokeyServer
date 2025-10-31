const roomService = require('../services/roomService');
const chatService = require('../services/chatService');

// In-memory tracking for quick live state
const onlineUsersByRoom = {};
const msgHistoryByRoom = {};

let ioRef = null;

/**
 * Attach socket handlers to the provided Socket.io server
 * options: { getIsDbConnected: () => boolean, msgHistoryKept: boolean, USE_DATABASE: boolean }
 */
function attachSocketHandlers(io, options = {}) {
  ioRef = io;
  const { getIsDbConnected = () => false, msgHistoryKept = true, USE_DATABASE = false } = options;

  io.on('connection', (socket) => {
    console.log('A user connected');
    let currentRoom = null;
    let currentUsername = null;

    // Listen for user joining a room
    socket.on('join room', async (data) => {
      const { room, username, password } = data;

      // Verify password if room requires it (do not allow empty string)
      if (USE_DATABASE && getIsDbConnected()) {
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
        socket.leave(currentRoom);

        // Remove from old room in database
        if (USE_DATABASE && getIsDbConnected()) {
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
      if (USE_DATABASE && getIsDbConnected()) {
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
        let history = [];
        
        // Try to load from database first if enabled
        if (USE_DATABASE && getIsDbConnected()) {
          try {
            const roomData = await roomService.getRoomByName(room);
            if (roomData && roomData.persistMessages) {
              // Load messages from database
              const dbMessages = await chatService.getLimitedMessages(room, 50);
              // Convert to plain objects and ensure _id is included
              history = dbMessages.map(msg => {
                const obj = msg.toObject ? msg.toObject() : msg;
                // Convert reactions Map to plain object
                const reactions = obj.reactions ? Object.fromEntries(obj.reactions) : {};
                return {
                  ...obj,
                  _id: obj._id ? obj._id.toString() : undefined,
                  userMsg: obj.message, // Map 'message' field to 'userMsg' for frontend
                  reactions: reactions // Convert Map to object for JSON serialization
                };
              });
              console.log(`Loaded ${history.length} messages from database for room: ${room}`);
            }
          } catch (error) {
            console.error('Error loading message history from database:', error.message);
          }
        }
        
        // Fall back to memory if no database messages
        if (history.length === 0) {
          history = msgHistoryByRoom[room] || [];
        }
        
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

      // Determine message type and handle reply data
      const messageType = data.replyTo ? 'reply' : 'message';

      // Store message in database if enabled
      if (msgHistoryKept) {
        // Check if room wants messages persisted to database
        let shouldPersist = false; // Default to false (memory-only)
        let savedMessageId = null;
        
        if (USE_DATABASE && getIsDbConnected()) {
          try {
            const roomData = await roomService.getRoomByName(data.room);
            // Only persist if room explicitly says to persist
            shouldPersist = roomData && roomData.persistMessages === true;

            // Try to save to database if room allows it
            if (shouldPersist) {
              const messageData = {
                username: data.username,
                message: data.userMsg,
                room: data.room,
                messageType
              };

              // Add reply context if this is a reply
              if (data.replyTo) {
                messageData.replyTo = {
                  messageId: data.replyTo.messageId,
                  username: data.replyTo.username,
                  message: data.replyTo.message,
                  timestamp: data.replyTo.timestamp
                };
              }

              const savedMessage = await chatService.saveMessage(messageData);
              savedMessageId = savedMessage._id.toString();
              console.log(`Msg saved|${data.username}|${data.room}|${messageType}|Db|`);
              
              // Increment room message count
              await roomService.incrementMessageCount(data.room);
            } else {
              console.log(`Msg saved|${data.username}|${data.room}|${messageType}|NoDb|`);
            }
          } catch (error) {
            console.error('❌ Failed to save message to database:', error.message);
          }
        }

        // Always store in memory as backup (include message type and _id if saved)
        const memoryCopy = { 
          ...data, 
          messageType,
          _id: savedMessageId // Include database ID if available
        };
        if (!msgHistoryByRoom[data.room]) {
          msgHistoryByRoom[data.room] = [];
        }
        msgHistoryByRoom[data.room].push(memoryCopy);
        // Limit history size to last 100 messages per room
        if (msgHistoryByRoom[data.room].length > 100) {
          msgHistoryByRoom[data.room].shift();
        }
      }

      // Broadcast the message to all clients in the room (include message type, reply context, and _id)
      const broadcastData = { 
        ...data, 
        messageType
      };
      
      // Add _id from memory copy if it exists
      if (msgHistoryByRoom[data.room] && msgHistoryByRoom[data.room].length > 0) {
        const lastMsg = msgHistoryByRoom[data.room][msgHistoryByRoom[data.room].length - 1];
        if (lastMsg._id) {
          broadcastData._id = lastMsg._id;
        }
      }
      
      io.to(data.room).emit('chat message', broadcastData);
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      socket.to(data.room).emit('user typing', {
        room: data.room,
        username: data.username
      });
    });

    socket.on('stop typing', (data) => {
      socket.to(data.room).emit('user stop typing', {
        room: data.room,
        username: currentUsername
      });
    });

    // Handle message reactions
    socket.on('toggle reaction', async (data) => {
      const { messageId, emoji, username, room } = data;
      
      if (USE_DATABASE && getIsDbConnected()) {
        try {
          const Message = require('../models/Message');
          const message = await Message.findById(messageId);
          
          if (message) {
            await message.toggleReaction(emoji, username);
            
            // Broadcast reaction update to room
            io.to(room).emit('reaction update', {
              messageId,
              room,
              reactions: Object.fromEntries(message.reactions)
            });
          }
        } catch (error) {
          console.error('Error toggling reaction:', error.message);
        }
      }
    });

    // Handle client disconnection
    socket.on('disconnect', async () => {
      if (currentRoom && onlineUsersByRoom[currentRoom]) {
        // Remove user from database if enabled
        if (USE_DATABASE && getIsDbConnected()) {
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
}

function getOnlineUsersByRoom() {
  return onlineUsersByRoom;
}

function getMsgHistoryByRoom() {
  return msgHistoryByRoom;
}

module.exports = {
  attachSocketHandlers,
  getOnlineUsersByRoom,
  getMsgHistoryByRoom
};
