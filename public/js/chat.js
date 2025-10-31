// Client-side chat application logic

// Get room name from URL parameter or default to 'global'
const urlParams = new URLSearchParams(window.location.search);
let currentRoom = urlParams.get('room') || 'global';

// Username logic: use text box, fallback to 'Anon' if empty
let username = localStorage.getItem('hokeyUsername') || '';

window.addEventListener('DOMContentLoaded', () => {
  // Initialize theme
  initializeTheme();
  
  const usernameInput = document.getElementById('usernameInput');
  usernameInput.value = username;
  usernameInput.addEventListener('input', function() {
    username = usernameInput.value.trim();
    localStorage.setItem('hokeyUsername', username);
  });
  
  // Allow sending message with Enter key
  document.getElementById('messageInput').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      sendMessage();
    }
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    const menu = document.getElementById('roomDropdown');
    const button = document.getElementById('roomMenuToggle');
    if (!menu.contains(event.target) && event.target !== button) {
      menu.style.display = 'none';
    }
  });
});

/**
 * Get the current username from input or return 'Anon'
 */
function getCurrentUsername() {
  const val = document.getElementById('usernameInput').value.trim();
  return val ? val : 'Anon';
}

// Socket.io connection
const socket = io();

/**
 * Update the room title display based on current room
 */
function updateRoomTitle() {
  if (currentRoom === 'global') {
    // Keep original HokeyChat for global
    document.getElementById('roomTitle').textContent = 'Chat';
    document.querySelector('.hokey').textContent = 'Hokey';
  } else {
    // Show full room name for other rooms
    document.getElementById('roomTitle').textContent = '';
    document.querySelector('.hokey').textContent = currentRoom;
  }
  document.getElementById('pageTitle').textContent = `${currentRoom} - HokeyChat`;
}

/**
 * Toggle room dropdown menu visibility
 */
function toggleRoomMenu() {
  const menu = document.getElementById('roomDropdown');
  const isOpen = menu.style.display === 'block';
  menu.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    loadRooms();
  }
}

// --- Room Management ---

/**
 * Load rooms from the server
 */
async function loadRooms() {
  try {
    const response = await fetch('/api/rooms/live');
    const data = await response.json();
    
    if (data.success) {
      displayRooms(data.rooms);
    }
  } catch (error) {
    console.error('Error loading rooms:', error);
  }
}

/**
 * Display rooms in the dropdown menu
 */
function displayRooms(rooms) {
  const roomList = document.getElementById('roomList');
  roomList.innerHTML = '';
  
  if (rooms.length === 0) {
    roomList.innerHTML = '<p class="no-rooms">No rooms available</p>';
    return;
  }
  
  rooms.forEach(room => {
    const roomItem = document.createElement('div');
    roomItem.className = 'room-item';
    
    // Highlight current room with border
    if (room.name === currentRoom) {
      roomItem.classList.add('active');
    }
    
    // Highlight global room with gold
    if (room.name === 'global') {
      roomItem.classList.add('global-room');
    }
    
    const hasPassword = room.hasPassword ? '🔒' : '';
    const saveMode = room.persistMessages ? '💾' : '🧠';
    const onlineCount = room.onlineCount || 0; // Use real-time count
    const totalMessages = room.messageCount || 0;
    
    roomItem.innerHTML = `
      <div class="room-item-header">
        <strong>${hasPassword} ${escapeHtml(room.name)}</strong>
        <span class="room-item-count">${saveMode}</span>
      </div>
      <p class="room-item-desc">${escapeHtml(room.description || 'No description')}</p>
      <p class="room-item-stats">👥 ${onlineCount} online | 💬 ${totalMessages} msgs</p>
    `;
    
    roomItem.onclick = () => switchRoom(room.name, room.hasPassword);
    roomList.appendChild(roomItem);
  });
}

/**
 * Create a new room
 */
async function createRoom(event) {
  event.preventDefault();
  
  const roomName = document.getElementById('roomName').value.trim();
  const roomDescription = document.getElementById('roomDescription').value.trim();
  const roomPassword = document.getElementById('roomPassword').value;
  const saveToDatabase = document.getElementById('saveToDatabase').checked;
  
  if (!roomName) {
    alert('Room name is required!');
    return;
  }
  
  try {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: roomName,
        description: roomDescription,
        password: roomPassword || undefined,
        persistMessages: saveToDatabase,
        createdBy: username
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('roomName').value = '';
      document.getElementById('roomDescription').value = '';
      document.getElementById('roomPassword').value = '';
      document.getElementById('saveToDatabase').checked = true;
      loadRooms();
      switchRoom(roomName, !!roomPassword, roomPassword);
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error creating room:', error);
    alert('Failed to create room.');
  }
}

/**
 * Switch to a different room
 */
function switchRoom(roomName, hasPassword, knownPassword) {
  if (roomName === currentRoom) {
    toggleRoomMenu();
    return;
  }

  // Check if room requires password
  if (hasPassword && !knownPassword) {
    const password = prompt(`Enter password for room "${roomName}":`);
    if (!password) return;
    knownPassword = password;
  }

  currentRoom = roomName;
  updateRoomTitle();

  // Update URL without reload
  const newUrl = roomName === 'global' ? '/' : `/?room=${encodeURIComponent(roomName)}`;
  window.history.pushState({}, '', newUrl);

  // Rejoin the new room with password if needed
  socket.emit('join room', { 
    room: currentRoom, 
    username: getCurrentUsername(),
    password: knownPassword 
  });

  // Clear messages
  document.getElementById('messages').innerHTML = '';

  // Close menu
  toggleRoomMenu();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// --- Reply Feature ---

let replyingTo = null; // Stores the message being replied to

/**
 * Set up a reply to a specific message
 */
function replyToMessage(messageData) {
  replyingTo = messageData;
  
  // Show reply preview
  const replyPreview = document.getElementById('replyPreview');
  if (!replyPreview) {
    // Create reply preview element if it doesn't exist
    const preview = document.createElement('div');
    preview.id = 'replyPreview';
    preview.className = 'reply-preview';
    
    const inputArea = document.querySelector('.input-area');
    inputArea.parentNode.insertBefore(preview, inputArea);
  }
  
  const replyPreviewElem = document.getElementById('replyPreview');
  replyPreviewElem.innerHTML = `
    <div class="reply-preview-content">
      <span class="reply-preview-label">Replying to ${escapeHtml(messageData.username)}:</span>
      <span class="reply-preview-message">${escapeHtml(messageData.userMsg)}</span>
    </div>
    <button class="reply-preview-cancel" onclick="cancelReply()">✕</button>
  `;
  replyPreviewElem.style.display = 'flex';
  
  // Focus on input
  document.getElementById('messageInput').focus();
}

/**
 * Cancel the current reply
 */
function cancelReply() {
  replyingTo = null;
  const replyPreview = document.getElementById('replyPreview');
  if (replyPreview) {
    replyPreview.style.display = 'none';
  }
}

// --- Messaging ---

/**
 * Send a message to the server
 */
function sendMessage() {
  const userInput = document.getElementById('messageInput');
  let userMsg = userInput.value;

  userMsg = userMsg.trim();

  if (!userMsg) {
    alert("Message cannot be empty!");
    return;
  }
  if (userMsg.length > 200) {
    alert("Message too long! (max 200 characters)");
    return;
  }

  // Sanitize: escape < and > to prevent HTML injection
  userMsg = userMsg.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Add timestamp (ISO string)
  const timestamp = new Date().toISOString();

  const messageData = {
    username: getCurrentUsername(),
    userMsg,
    timestamp,
    room: currentRoom
  };

  // Add reply context if replying to a message
  if (replyingTo) {
    messageData.replyTo = {
      messageId: replyingTo.messageId || replyingTo.timestamp, // Use timestamp as fallback ID
      username: replyingTo.username,
      message: replyingTo.userMsg,
      timestamp: replyingTo.timestamp
    };
  }

  socket.emit('chat message', messageData);
  userInput.value = '';
  
  // Clear reply state after sending
  cancelReply();
}

/**
 * Toggle user dropdown visibility
 */
function toggleUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

// --- Socket.io Event Listeners ---

// Listen for user list updates from the server
socket.on('user list', function(data) {
  // Check if this update is for the current room
  if (data.room === currentRoom) {
    document.getElementById('onlineCount').textContent = data.users.length;
    const dropdown = document.getElementById('userDropdown');
    dropdown.innerHTML = '';
    data.users.forEach(function(user) {
      const userElem = document.createElement('div');
      userElem.textContent = user;
      userElem.style.padding = '4px 8px';
      dropdown.appendChild(userElem);
    });
  }
});

// Listen for room errors (like wrong password)
socket.on('room error', function(data) {
  const message = data.message || 'Room error';
  
  // If it's a password error, prompt for password and retry
  if (message.includes('Password required') || message.includes('Incorrect password')) {
    const password = prompt(`${message}\n\nEnter password for room "${currentRoom}":`);
    if (password && password.trim()) {
      // Retry joining with password
      socket.emit('join room', { 
        room: currentRoom, 
        username: getCurrentUsername(),
        password: password.trim()
      });
      return;
    }
  }
  
  // If user cancelled or other error, show alert and go back to global
  alert(message);
  switchRoom('global', false);
});

// Listen for message history from the server
socket.on('message history', function(history) {
  const messagesDiv = document.getElementById('messages');
  messagesDiv.innerHTML = '';
  history.forEach(function(data) {
    displayMessage(data);
  });
  // Scroll to bottom
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Listen for messages from the server
socket.on('chat message', function(msg) {
  // Only display messages from the current room
  if (msg.room === currentRoom) {
    displayMessage(msg);
    // Auto-scroll to bottom
    const msgDiv = document.getElementById('messages');
    msgDiv.scrollTop = msgDiv.scrollHeight;
  }
});

/**
 * Display a message in the chat
 */
function displayMessage(data) {
  const messagesDiv = document.getElementById('messages');
  const msgElem = document.createElement('div');
  msgElem.className = 'message';
  if (data.messageType === 'reply') {
    msgElem.classList.add('message-reply');
  }
  
  const time = data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '';
  
  let messageHTML = '';
  
  // Show reply context if this is a reply
  if (data.replyTo) {
    const replyTime = data.replyTo.timestamp ? new Date(data.replyTo.timestamp).toLocaleTimeString() : '';
    messageHTML += `
      <div class="reply-context">
        <div class="reply-bar"></div>
        <div class="reply-info">
          <span class="reply-username">${escapeHtml(data.replyTo.username)}</span>
          <span class="reply-time">[${replyTime}]</span>
          <span class="reply-message">${escapeHtml(data.replyTo.message)}</span>
        </div>
      </div>
    `;
  }
  
  // Message content
  messageHTML += `
    <div class="message-content">
      <span class="message-time">[${time}]</span>
      <span class="message-username">${escapeHtml(data.username)}:</span>
      <span class="message-text">${escapeHtml(data.userMsg)}</span>
      <button class="message-reply-btn" onclick='replyToMessage(${JSON.stringify({
        messageId: data._id || data.timestamp,
        username: data.username,
        userMsg: data.userMsg,
        timestamp: data.timestamp
      }).replace(/'/g, "&apos;")})' title="Reply to this message">↩</button>
    </div>
  `;
  
  msgElem.innerHTML = messageHTML;
  messagesDiv.appendChild(msgElem);
}

// On connect, join the room (prompt for password if needed)
socket.on('connect', async function() {
  // Set room title on connect
  updateRoomTitle();
  
  if (currentRoom !== 'global') {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(currentRoom)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert('Room not found or error fetching room info. Redirecting to global.');
        switchRoom('global', false);
        return;
      }

      if (data.room && data.room.hasPassword) {
        const pw = prompt(`Enter password for room "${currentRoom}":`);
        if (!pw) {
          // user cancelled
          switchRoom('global', false);
          return;
        }
        socket.emit('join room', { room: currentRoom, username: getCurrentUsername(), password: pw });
        return;
      }
    } catch (err) {
      console.error('Error fetching room info on connect:', err);
      // fallthrough to join without password
    }
  }

  socket.emit('join room', { room: currentRoom, username: getCurrentUsername() });
});

// Handle disconnection
socket.on('disconnect', function() {
  console.log('Disconnected from server');
});
