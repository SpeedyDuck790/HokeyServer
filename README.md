# HokeyChat
### by James Hill

A real-time global chat application built with Node.js, Express.js, and Socket.io.
---
![Chat App Screenshot](./assets/firstdemodeploy.png | width=500)
---

## Features
- Real-time messaging between all connected users
- Usernames and online user list
- Message history (optional, in-memory)
- Timestamps for each message
- Input validation and sanitization
- Send messages with Enter key
- Responsive, simple web interface

---

## Deployment Options

### 1. Localhost (Single Computer)
```
node index.js
```
Visit: [http://localhost:8080](http://localhost:8080)

### 2. Local Network (LAN/IP, for devices on same Wi-Fi)
```
node index.js ip
```
Visit: `http://<your-laptop-ip>:8080` from other devices on the same network.

### 3. Web Deployment (Render)
- Push code to GitHub.
- Deploy as a Web Service on [Render](https://render.com/).
- The app will be accessible at your Render URL (e.g., `https://hokeychat.onrender.com`).

---

## Project Structure

```
HokeyServer/
├── index.js         # Main server code (Node.js + Express + Socket.io)
├── index.html       # Client-side chat interface
├── package.json     # Project metadata and dependencies
├── .gitignore       # Files/folders to ignore in git 
└── README.md        # This file
```

---

## Database (MongoDB Atlas)

This app uses MongoDB Atlas for persistent chat history. You can use any MongoDB instance, but Atlas is recommended for easy cloud hosting.

### Database Folder Structure

```
database/
├── connection.js           # Handles MongoDB connection
├── models/
│   └── Message.js         # Mongoose schema/model for chat messages
└── services/
    └── chatService.js     # Service for saving/fetching/cleaning up messages
```

### Environment Variables (.env)

Sensitive info like your database URI is stored in a `.env` file (never commit this to git!):
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database>?retryWrites=true&w=majority&appName=Hokey-Chat
PORT=3000
```
- Replace `<username>`, `<password>`, and `<cluster-url>` with your MongoDB Atlas details.
- The default database name is `hokey-chat`.

### How it Works
- On server start, the app connects to MongoDB using the URI from `.env`.
- Messages are saved to the database and loaded for new users.
- Old messages are automatically cleaned up (max 1000 per room).
- If the database is unavailable, the app falls back to in-memory history (not persistent).


