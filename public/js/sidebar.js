/**
 * Sidebar Management
 * Tracks and displays recently visited rooms in a persistent sidebar
 */

// Get recent rooms from localStorage
function getRecentRooms() {
  const stored = localStorage.getItem('recentRooms');
  return stored ? JSON.parse(stored) : [];
}

// Save recent rooms to localStorage
function saveRecentRooms(rooms) {
  localStorage.setItem('recentRooms', JSON.stringify(rooms));
}

// Add a room to recent history
function addToRecentRooms(roomName) {
  let recentRooms = getRecentRooms();
  
  // Remove if already exists (to update timestamp)
  recentRooms = recentRooms.filter(r => r.name !== roomName);
  
  // Add to beginning with current timestamp
  recentRooms.unshift({
    name: roomName,
    timestamp: Date.now()
  });
  
  // Keep only last 10 rooms
  recentRooms = recentRooms.slice(0, 10);
  
  saveRecentRooms(recentRooms);
  updateSidebarDisplay();
}

// Format timestamp for display
function formatRoomTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Update sidebar display
function updateSidebarDisplay() {
  const recentRooms = getRecentRooms();
  const listElement = document.getElementById('recentRoomsList');
  
  if (!listElement) return;
  
  if (recentRooms.length === 0) {
    listElement.innerHTML = '<p style="opacity: 0.6; font-size: 0.9em; text-align: center;">No recent rooms</p>';
    return;
  }
  
  listElement.innerHTML = recentRooms.map(room => `
    <div class="recent-room" onclick="switchToRoom('${room.name}')">
      <div class="recent-room-name">${room.name}</div>
      <div class="recent-room-time">${formatRoomTime(room.timestamp)}</div>
    </div>
  `).join('');
}

// Switch to a room from sidebar
function switchToRoom(roomName) {
  // Emit leave current room
  if (window.currentRoom) {
    socket.emit('leave room', window.currentRoom);
  }
  
  // Join new room
  socket.emit('join room', roomName, getUsername());
  window.currentRoom = roomName;
  
  // Update UI
  document.getElementById('roomTitle').textContent = ` - ${roomName}`;
  document.getElementById('pageTitle').textContent = `HokeyChat - ${roomName}`;
  document.getElementById('messages').innerHTML = '';
  
  // Add to recent rooms
  addToRecentRooms(roomName);
}

// Toggle sidebar collapsed state
function toggleSidebar() {
  const sidebar = document.getElementById('roomSidebar');
  const toggle = sidebar.querySelector('.sidebar-toggle');
  
  sidebar.classList.toggle('collapsed');
  
  // Update toggle button arrow
  if (sidebar.classList.contains('collapsed')) {
    toggle.textContent = '▶';
    toggle.title = 'Expand sidebar';
    localStorage.setItem('sidebarCollapsed', 'true');
  } else {
    toggle.textContent = '◀';
    toggle.title = 'Collapse sidebar';
    localStorage.setItem('sidebarCollapsed', 'false');
  }
}

// Initialize sidebar on page load
document.addEventListener('DOMContentLoaded', () => {
  updateSidebarDisplay();
  
  // Restore collapsed state
  const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  if (isCollapsed) {
    const sidebar = document.getElementById('roomSidebar');
    const toggle = sidebar.querySelector('.sidebar-toggle');
    sidebar.classList.add('collapsed');
    toggle.textContent = '▶';
    toggle.title = 'Expand sidebar';
  }
  
  // Update timestamps every minute
  setInterval(updateSidebarDisplay, 60000);
});
