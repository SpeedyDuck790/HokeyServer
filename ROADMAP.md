# Global Chat App: Incremental Learning Roadmap

## 1. Fundamentals: Understand Servers & Clients
- Learn what a server and a client are.
- Learn about HTTP, requests, and responses.

## 2. Set Up Your Project
- Install Node.js.
- Initialize a new project (`npm init`).
- Install Express.js.

## 3. Build a Basic HTTP Server
- Create a simple Express server.
- Serve a static HTML page to the browser.

## 4. Add a Simple Chat Interface
- Create an HTML page with a text input and a message display area.
- Use JavaScript to send messages (initially via HTTP POST).

## 5. Learn About Real-Time Communication
- Research the limitations of HTTP for real-time apps.
- Learn what WebSockets are and why they’re used for chat.

## 6. Add Real-Time Messaging with WebSockets
- Install and set up `socket.io` (or similar) on both server and client.
- Update your client to send/receive messages in real time.
- Broadcast messages to all connected clients.

## 7. Handle Multiple Users
- Display messages from all users in real time.
- Optionally, add usernames or user IDs.

## 8. Polish and Expand
- Add message history (store messages in memory or a database).
- Add basic styling to your chat page.
- Optionally, deploy your app online.

---

### Learning Focus at Each Step

- **Steps 1–3:** How servers and clients communicate (HTTP basics).
- **Step 4:** How data is sent from client to server.
- **Step 5:** Why HTTP isn’t enough for real-time chat.
- **Step 6:** How WebSockets enable real-time, two-way communication.
- **Step 7:** How servers manage multiple connections and broadcast data.
