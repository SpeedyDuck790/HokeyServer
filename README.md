# HokeyChat
### by James Hill

A real-time multi-room chat application built with Node.js, Express.js, Socket.io, and MongoDB.
---
![Chat App Screenshot](./assets/firstdemodeploy.png | width=500)
---

## Features
- 🏠 **Multiple Chat Rooms** - Create and join separate chat rooms
- 💬 **Real-time Messaging** - Instant messaging with Socket.io
- 👥 **Room Lobby** - Browse available rooms with user counts and message stats
- 📝 **Room Creation** - Users can create custom rooms with descriptions
- 🔒 **Room Isolation** - Messages only visible within the same room
- 👤 **User Tracking** - Per-room active user lists
- 📜 **Message History** - Separate message history for each room
- 💾 **Persistent Storage** - Rooms and messages saved to MongoDB
- 🎨 **Dark/Light Theme** - Toggle between themes with persistence
- 📱 **Responsive Design** - Works on mobile and desktop
- ⚡ **Real-time Updates** - User lists and messages update instantly
- 🔐 **Input Validation** - Sanitization and length limits for security

---

## Deployment Options

### 1. Localhost (Single Computer)
```bash
# With database enabled
node index.js db

# Without database (memory-only)
node index.js
```
Visit: [http://localhost:8080](http://localhost:8080)

### 2. Local Network (LAN/IP, for devices on same Wi-Fi)
```bash
node index.js ip
```
Visit: `http://<your-laptop-ip>:8080` from other devices on the same network.

### 3. Web Deployment (Render)
- Push code to GitHub.
- Deploy as a Web Service on [Render](https://render.com/).
- Set environment variable `USE_DATABASE=true` and add your `MONGODB_URI`.
- The app will be accessible at your Render URL (e.g., `https://hokeychat.onrender.com`).

---

## Project Structure

```
HokeyServer/
├── views/                      # Frontend HTML views
│   ├── lobby.html             # Room list/lobby page
│   └── chat.html              # Individual room chat view
├── controllers/               # Route controllers
│   └── roomController.js      # Room CRUD operations
├── database/
│   ├── connection.js          # MongoDB connection manager
│   ├── models/
│   │   ├── Message.js         # Message schema/model
│   │   └── Room.js            # Room schema/model
│   └── services/
│       ├── chatService.js     # Message operations
│       └── roomService.js     # Room operations (CRUD)
├── assets/
│   ├── style.css              # Global styles + room UI
│   └── room.js                # Client-side room management
├── index.js                   # Main server (Express + Socket.io)
├── index.html                 # Original chat (preserved for backup)
├── package.json               # Dependencies and scripts
├── .env                       # Environment variables (not in git)
├── .gitignore                 # Files to ignore
└── README.md                  # This file
```

---

## How to Use

### User Flow

1. **Visit Homepage** (`/`)
   - Enter your username (stored in browser)
   - See the lobby with all available rooms
  - Default room: **global**

2. **Create a Room**
   - Fill in room name (required, max 50 characters)
   - Add optional description (max 200 characters)
   - Click "Create Room"

3. **Join a Room**
   - Click "Join" button on any room card
   - View room details: active users, message count
   - Redirected to chat interface

4. **Chat in Room**
   - Send messages (visible only to users in that room)
   - See online users in current room
   - View message history
   - Click "← Back to Lobby" to return

### Room Features

- **Room Cards** display:
  - Room name and description
  - Active users / Max capacity
  - Total message count
  - Join button

- **Chat View**:
  - Room name replaces "HokeyChat" in title
  - Room-specific online user list
  - Isolated message history
  - Back to lobby navigation

---

## API Endpoints

### Get All Rooms
```http
GET /api/rooms
Response: { success: true, rooms: [...] }
```

### Get Specific Room
```http
GET /api/rooms/:roomName
Response: { success: true, room: {...} }
```

### Create Room
```http
POST /api/rooms
Body: {
  "name": "room-name",
  "description": "optional description",
  "createdBy": "username"
}
Response: { success: true, room: {...} }
```

### Update Room
```http
PUT /api/rooms/:roomName
Body: { "description": "new description", "isPublic": true }
Response: { success: true, room: {...} }
```

### Delete Room
```http
DELETE /api/rooms/:roomName
Response: { success: true, message: "Room deleted" }
```

---

## Database (MongoDB Atlas)

This app uses MongoDB Atlas for persistent chat history and room data. You can use any MongoDB instance, but Atlas is recommended for easy cloud hosting.

### Database Folder Structure

```
database/
├── connection.js              # Handles MongoDB connection
├── models/
│   ├── Message.js            # Mongoose schema for chat messages
│   └── Room.js               # Mongoose schema for rooms
└── services/
    ├── chatService.js        # Message operations (save/fetch/cleanup)
    └── roomService.js        # Room operations (CRUD)
```

### Environment Variables (.env)

Sensitive info like your database URI is stored in a `.env` file (never commit this to git!):
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database>?retryWrites=true&w=majority&appName=Hokey-Chat
PORT=8080
USE_DATABASE=true
```
- Replace `<username>`, `<password>`, and `<cluster-url>` with your MongoDB Atlas details.
- The default database name is `hokey-chat`.
- Set `USE_DATABASE=true` to enable database, or use `node index.js db` command.

### Database Schemas

#### Room Schema
```javascript
{
  name: String (unique, required),
  description: String,
  activeUsers: [{ socketId, username, joinedAt }],
  messageCount: Number,
  createdBy: String,
  isPublic: Boolean,
  maxUsers: Number (default: 100),
  createdAt: Date,
  updatedAt: Date
}
```

#### Message Schema
```javascript
{
  username: String,
  message: String,
  timestamp: Date,
  room: String,        // Room identifier
  messageType: String,
  isEdited: Boolean
}
```

### How it Works
- On server start, the app connects to MongoDB using the URI from `.env`.
- **Default room** (global) is automatically created.
- Messages are saved to the database and loaded per room for new users.
- Old messages are automatically cleaned up (max 1000 per room).
- **Rooms track active users** in real-time with socket connections.
- If the database is unavailable, the app falls back to in-memory mode (not persistent).

---

## Socket.io Events

### Client → Server

- **`join room`**: User joins a specific room
  ```javascript
  socket.emit('join room', { room: 'room-name', username: 'user' });
  ```

- **`chat message`**: Send a message to current room
  ```javascript
  socket.emit('chat message', { 
    username, 
    userMsg, 
    timestamp, 
    room 
  });
  ```

### Server → Client

- **`user list`**: Updated list of online users in room
  ```javascript
  socket.on('user list', (data) => {
    // data: { room: 'room-name', users: ['user1', 'user2'] }
  });
  ```

- **`message history`**: Message history when joining room
  ```javascript
  socket.on('message history', (messages) => {
    // messages: array of past messages
  });
  ```

- **`chat message`**: New message broadcast to room
  ```javascript
  socket.on('chat message', (msg) => {
    // msg: { username, userMsg, timestamp, room }
  });
  ```

---

## Technical Features

### Room Management
- **CRUD Operations**: Full create, read, update, delete for rooms
- **User Tracking**: Real-time tracking of active users per room
- **Message Isolation**: Messages only visible within the same room
- **Auto-cleanup**: Old messages removed when limit exceeded
- **Default Rooms**: Automatically initialized on startup

### Security
- Input sanitization (HTML escaping)
- Message length validation (200 chars max)
- Room name validation (50 chars max)
- XSS prevention
- Server-side validation

### Performance
- Message history limited to 100 per room in memory
- Database cleanup for old messages (1000 per room max)
- Efficient Socket.io room-based broadcasting
- Auto-refresh room list every 10 seconds

### User Experience
- Username persistence in localStorage
- Theme preference persistence (dark/light)
- Responsive mobile-first design
- Real-time updates without page refresh
- Clean room navigation

---

## Future Enhancement Ideas

- 🔒 Private rooms with passwords
- 👑 Room ownership and admin controls
- 🚫 Kick/ban users from rooms
- 📌 Pin important messages
- 🔔 Room notifications and mentions
- 🎨 Custom room themes/colors
- 📊 Room statistics and analytics
- 💬 Direct messages between users
- 🖼️ Room avatars/icons
- 🔍 Search and filter rooms
- 📁 Room categories
- ⭐ Favorite rooms

---

## Troubleshooting

**Database not connecting?**
- Check your `.env` file has correct `MONGODB_URI`
- Ensure your IP is whitelisted in MongoDB Atlas
- Verify network access rules in Atlas dashboard
- App will fallback to memory-only mode if database fails

**Rooms not loading?**
- Check browser console for errors
- Ensure server is running with database enabled (`node index.js db`)
- Try refreshing the page
- Check `/api/rooms` endpoint directly

**Messages not appearing?**
- Ensure you've joined a room
- Check you're in the same room as other users
- Verify Socket.io connection in browser console
- Check for any client-side JavaScript errors

---

## Development Notes

- **MVC Architecture**: Controllers, services, models separated
- **RESTful API**: Standard HTTP methods for room operations
- **Real-time Communication**: Socket.io for instant updates
- **Database Abstraction**: Services handle all database operations
- **Graceful Fallback**: Works without database in memory-only mode
- **Responsive Design**: Mobile-first CSS with media queries

---

## License

This project is open source and available for educational purposes.


