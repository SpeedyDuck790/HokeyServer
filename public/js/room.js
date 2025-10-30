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

// Initialize theme
initializeTheme();

const socket = io(); // Connect to the server

// Fetch and display rooms
async function loadRooms() {
  try {
    const response = await fetch('/api/rooms/live');
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
    
    // Highlight global room with gold
    if (room.name === 'global') {
      roomCard.classList.add('global-room');
    }
    
    // Status indicators
    const hasPassword = room.hasPassword ? '🔒' : '';
    const saveMode = room.persistMessages ? '💾' : '🧠';
    const onlineCount = room.onlineCount || 0; // Use real-time count
    const totalMessages = room.messageCount || 0;
    
    roomCard.innerHTML = `
      <div class="room-header">
        <h3>${hasPassword} ${escapeHtml(room.name)}</h3>
        <span class="room-users">${saveMode}</span>
      </div>
      <p class="room-description">${escapeHtml(room.description || 'No description')}</p>
      <div class="room-footer">
        <span class="room-messages">👥 ${onlineCount} online | 💬 ${totalMessages} msgs</span>
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
  const roomPassword = document.getElementById('roomPassword').value;
  const saveToDatabase = document.getElementById('saveToDatabase').checked;
  
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
        password: roomPassword || undefined,
        persistMessages: saveToDatabase,
        createdBy: username
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`Room "${roomName}" created successfully!`);
      // Clear form
      document.getElementById('roomName').value = '';
      document.getElementById('roomDescription').value = '';
      document.getElementById('roomPassword').value = '';
      document.getElementById('saveToDatabase').checked = true;
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
