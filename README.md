

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

