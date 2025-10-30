// Room management client-side JavaScript
// Get username from localStorage or prompt
let username = localStorage.getItem('hokeyUsername');
if (!username) {
  username = prompt("Enter your username:");
  if (!username) username = "Anon";
  localStorage.setItem('hokeyUsername', username);
}

// Display username
document.getElementById('usernameDisplay').textContent = `Logged in as: ${username}`;

const socket = io(); // Connect to the server

// --- Theme toggle ---
let isDark = localStorage.getItem('hokeyTheme') === 'light' ? false : true;

function setTheme(bg, text) {
  document.documentElement.style.setProperty('--bg-color', bg);
  document.documentElement.style.setProperty('--text-color', text);
  document.documentElement.style.setProperty('--header-color', text);
  if (bg === '#222') {
    // Dark mode
    document.documentElement.style.setProperty('--user-list-bg', '#333');
    document.documentElement.style.setProperty('--messages-bg', '#222');
    document.documentElement.style.setProperty('--button-bg', '#8e44ad');
    document.documentElement.style.setProperty('--room-card-bg', '#333');
    document.documentElement.style.setProperty('--room-card-hover', '#444');
  } else {
    // Light mode
    document.documentElement.style.setProperty('--user-list-bg', '#f0f0f0');
    document.documentElement.style.setProperty('--messages-bg', '#fafafa');
    document.documentElement.style.setProperty('--button-bg', '#007bff');
    document.documentElement.style.setProperty('--room-card-bg', '#f9f9f9');
    document.documentElement.style.setProperty('--room-card-hover', '#e9e9e9');
  }
}

function toggleTheme() {
  isDark = !isDark;
  if (isDark) {
    setTheme('#222', '#fff');
    document.getElementById('themeToggle').textContent = '☀️';
    localStorage.setItem('hokeyTheme', 'dark');
  } else {
    setTheme('#fff', '#222');
    document.getElementById('themeToggle').textContent = '🌙';
    localStorage.setItem('hokeyTheme', 'light');
  }
}

// Set initial theme
if (isDark) {
  setTheme('#222', '#fff');
  document.getElementById('themeToggle').textContent = '☀️';
} else {
  setTheme('#fff', '#222');
  document.getElementById('themeToggle').textContent = '🌙';
}

// Fetch and display rooms
async function loadRooms() {
  try {
    const response = await fetch('/api/rooms');
    const data = await response.json();
    
    if (data.success) {
      displayRooms(data.rooms);
    } else {
      console.error('Failed to load rooms:', data.error);
    }
  } catch (error) {
    console.error('Error loading rooms:', error);
  }
}

// Display rooms in the UI
function displayRooms(rooms) {
  const roomList = document.getElementById('roomList');
  roomList.innerHTML = '';
  
  if (rooms.length === 0) {
    roomList.innerHTML = '<p>No rooms available. Create one!</p>';
    return;
  }
  
  rooms.forEach(room => {
    const roomCard = document.createElement('div');
    roomCard.className = 'room-card';
    roomCard.innerHTML = `
      <div class="room-header">
        <h3>${escapeHtml(room.name)}</h3>
        <span class="room-users">${room.activeUsers.length}/${room.maxUsers} users</span>
      </div>
      <p class="room-description">${escapeHtml(room.description || 'No description')}</p>
      <div class="room-footer">
        <span class="room-messages">${room.messageCount} messages</span>
        <button onclick="joinRoom('${escapeHtml(room.name)}')">Join</button>
      </div>
    `;
    roomList.appendChild(roomCard);
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Join a room
function joinRoom(roomName) {
  window.location.href = `/chat?room=${encodeURIComponent(roomName)}`;
}

// Create room form handler
document.getElementById('createRoomForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const roomName = document.getElementById('roomName').value.trim();
  const roomDescription = document.getElementById('roomDescription').value.trim();
  
  if (!roomName) {
    alert('Room name is required!');
    return;
  }
  
  try {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: roomName,
        description: roomDescription,
        createdBy: username
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`Room "${roomName}" created successfully!`);
      // Clear form
      document.getElementById('roomName').value = '';
      document.getElementById('roomDescription').value = '';
      // Reload rooms
      loadRooms();
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error creating room:', error);
    alert('Failed to create room. Please try again.');
  }
});

// Load rooms on page load
loadRooms();

// Reload rooms every 10 seconds
setInterval(loadRooms, 10000);
