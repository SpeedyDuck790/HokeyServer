/**
 * Admin Panel Functions
 * Handles badge assignment, user management, and moderation
 */

/**
 * Check if current user has admin privileges
 */
function isAdmin() {
  const currentUser = JSON.parse(localStorage.getItem('hokeyCurrentUser') || '{}');
  return currentUser.profile?.badges?.includes('site-admin') || false;
}

/**
 * Check if current user has chat admin privileges for a room
 */
function isChatAdmin(roomName) {
  const currentUser = JSON.parse(localStorage.getItem('hokeyCurrentUser') || '{}');
  if (currentUser.profile?.badges?.includes('site-admin')) return true;
  if (currentUser.roomRoles) {
    return currentUser.roomRoles.some(r => r.roomName === roomName && r.role === 'admin');
  }
  return false;
}

/**
 * Check if current user has moderator privileges for a room
 */
function isModerator(roomName) {
  const currentUser = JSON.parse(localStorage.getItem('hokeyCurrentUser') || '{}');
  if (isAdmin() || isChatAdmin(roomName)) return true;
  if (currentUser.roomRoles) {
    return currentUser.roomRoles.some(r => r.roomName === roomName && (r.role === 'moderator' || r.role === 'admin'));
  }
  return false;
}

/**
 * Show admin panel
 */
function showAdminPanel() {
  if (!isAdmin()) {
    alert('Access denied: Admin privileges required');
    return;
  }

  const modal = document.createElement('div');
  modal.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000; overflow-y: auto; padding: 20px;">
      <div style="background: var(--bg-color); padding: 30px; border-radius: 12px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto;">
        <h2 style="margin: 0 0 20px 0;">👑 Site Admin Panel</h2>
        
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          <button onclick="showAdminTab('badges')" id="adminTabBadges" style="flex: 1; padding: 10px; border-radius: 6px; background: #4CAF50; color: white; border: none; cursor: pointer;">
            Badge Management
          </button>
          <button onclick="showAdminTab('users')" id="adminTabUsers" style="flex: 1; padding: 10px; border-radius: 6px; background: var(--button-bg); color: var(--text-color); border: 1px solid var(--border-color); cursor: pointer;">
            User Management
          </button>
          <button onclick="showAdminTab('rooms')" id="adminTabRooms" style="flex: 1; padding: 10px; border-radius: 6px; background: var(--button-bg); color: var(--text-color); border: 1px solid var(--border-color); cursor: pointer;">
            Room Management
          </button>
        </div>
        
        <div id="adminTabContent"></div>
        
        <div style="margin-top: 20px; text-align: right;">
          <button onclick="this.closest('div[style*=fixed]').remove()" style="padding: 10px 20px; border-radius: 6px; background: #666; color: white; border: none; cursor: pointer;">
            Close
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  showAdminTab('badges');
}

/**
 * Show chat admin panel (for room-specific admins)
 */
function showChatAdminPanel() {
  const currentUser = JSON.parse(localStorage.getItem('hokeyCurrentUser') || '{}');
  const roomRoles = currentUser.roomRoles || [];
  
  // Filter to only rooms where user is admin or moderator
  const managedRooms = roomRoles.filter(r => r.role === 'admin' || r.role === 'moderator');
  
  if (managedRooms.length === 0) {
    alert('You don\'t have admin or moderator privileges for any rooms');
    return;
  }

  const modal = document.createElement('div');
  modal.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000; overflow-y: auto; padding: 20px;">
      <div style="background: var(--bg-color); padding: 30px; border-radius: 12px; max-width: 700px; width: 90%; max-height: 90vh; overflow-y: auto;">
        <h2 style="margin: 0 0 20px 0;">🔧 Chat Admin Panel</h2>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 10px;">Select Room:</label>
          <select id="chatAdminRoomSelect" onchange="loadChatAdminRoom(this.value)" style="width: 100%; padding: 10px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color);">
            <option value="">-- Select a room --</option>
            ${managedRooms.map(r => `<option value="${escapeHtml(r.roomName)}">${escapeHtml(r.roomName)} (${r.role})</option>`).join('')}
          </select>
        </div>
        
        <div id="chatAdminContent" style="min-height: 200px;">
          <p style="text-align: center; opacity: 0.5;">Select a room to manage</p>
        </div>
        
        <div style="margin-top: 20px; text-align: right;">
          <button onclick="this.closest('div[style*=fixed]').remove()" style="padding: 10px 20px; border-radius: 6px; background: #666; color: white; border: none; cursor: pointer;">
            Close
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

/**
 * Load chat admin panel for specific room
 */
function loadChatAdminRoom(roomName) {
  if (!roomName) {
    document.getElementById('chatAdminContent').innerHTML = '<p style="text-align: center; opacity: 0.5;">Select a room to manage</p>';
    return;
  }
  
  const currentUser = JSON.parse(localStorage.getItem('hokeyCurrentUser') || '{}');
  const roomRole = (currentUser.roomRoles || []).find(r => r.roomName === roomName);
  
  if (!roomRole) {
    document.getElementById('chatAdminContent').innerHTML = '<p style="text-align: center; color: #f44336;">Access denied</p>';
    return;
  }
  
  const isRoomAdmin = roomRole.role === 'admin';
  
  document.getElementById('chatAdminContent').innerHTML = `
    <h3>Managing: ${escapeHtml(roomName)}</h3>
    <p style="opacity: 0.7; margin-bottom: 20px;">Your role: ${roomRole.role}</p>
    
    ${isRoomAdmin ? `
      <div style="padding: 15px; border-radius: 8px; background: var(--input-bg); margin-bottom: 15px;">
        <h4 style="margin: 0 0 10px 0;">Assign Moderator</h4>
        <input type="text" id="modUsername" placeholder="Enter username..." style="width: 100%; padding: 10px; border-radius: 6px; background: var(--bg-color); color: var(--text-color); border: 1px solid var(--border-color); margin-bottom: 10px;">
        <button onclick="assignRoomModerator('${escapeHtml(roomName)}')" style="width: 100%; padding: 10px; border-radius: 6px; background: #4CAF50; color: white; border: none; cursor: pointer;">
          Assign as Moderator
        </button>
      </div>
    ` : ''}
    
    <div style="padding: 15px; border-radius: 8px; background: var(--input-bg); margin-bottom: 15px;">
      <h4 style="margin: 0 0 10px 0;">Ban User from Room</h4>
      <input type="text" id="banUsername" placeholder="Enter username..." style="width: 100%; padding: 10px; border-radius: 6px; background: var(--bg-color); color: var(--text-color); border: 1px solid var(--border-color); margin-bottom: 10px;">
      <input type="number" id="banDuration" placeholder="Duration in hours (leave empty for permanent)" style="width: 100%; padding: 10px; border-radius: 6px; background: var(--bg-color); color: var(--text-color); border: 1px solid var(--border-color); margin-bottom: 10px;">
      <button onclick="banUserFromRoomPanel('${escapeHtml(roomName)}')" style="width: 100%; padding: 10px; border-radius: 6px; background: #f44336; color: white; border: none; cursor: pointer;">
        Ban User
      </button>
    </div>
    
    <div style="padding: 15px; border-radius: 8px; background: var(--input-bg);">
      <h4 style="margin: 0 0 10px 0;">Kick User from Room</h4>
      <input type="text" id="kickUsername" placeholder="Enter username..." style="width: 100%; padding: 10px; border-radius: 6px; background: var(--bg-color); color: var(--text-color); border: 1px solid var(--border-color); margin-bottom: 10px;">
      <button onclick="kickUserFromRoomPanel('${escapeHtml(roomName)}')" style="width: 100%; padding: 10px; border-radius: 6px; background: #ff9800; color: white; border: none; cursor: pointer;">
        Kick User
      </button>
    </div>
  `;
}

/**
 * Show specific admin tab
 */
function showAdminTab(tab) {
  // Update button styles
  document.getElementById('adminTabBadges').style.background = tab === 'badges' ? '#4CAF50' : 'var(--button-bg)';
  document.getElementById('adminTabUsers').style.background = tab === 'users' ? '#4CAF50' : 'var(--button-bg)';
  document.getElementById('adminTabRooms').style.background = tab === 'rooms' ? '#4CAF50' : 'var(--button-bg)';
  
  const content = document.getElementById('adminTabContent');
  
  if (tab === 'badges') {
    content.innerHTML = `
      <h3>Assign Badge to User</h3>
      <div style="margin-bottom: 20px;">
        <input type="text" id="badgeUsername" placeholder="Enter username..." style="width: 100%; padding: 10px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color); margin-bottom: 10px;">
        
        <label style="display: block; margin-bottom: 5px;">Select Badge:</label>
        <select id="badgeSelect" style="width: 100%; padding: 10px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color); margin-bottom: 10px;">
          <option value="site-admin">👑 Site Admin</option>
          <option value="chat-admin">🔧 Chat Admin</option>
          <option value="chat-mod">🛡️ Chat Moderator</option>
          <option value="vip">⭐ VIP</option>
          <option value="elder">🎖️ Elder</option>
          <option value="founder">💎 Founder</option>
          <option value="contributor">🤝 Contributor</option>
          <option value="verified">✅ Verified</option>
          <option value="premium">💫 Premium</option>
        </select>
        
        <div style="display: flex; gap: 10px;">
          <button onclick="assignBadge()" style="flex: 1; padding: 10px; border-radius: 6px; background: #4CAF50; color: white; border: none; cursor: pointer;">
            Assign Badge
          </button>
          <button onclick="removeBadge()" style="flex: 1; padding: 10px; border-radius: 6px; background: #f44336; color: white; border: none; cursor: pointer;">
            Remove Badge
          </button>
        </div>
      </div>
      
      <div id="badgeResult" style="margin-top: 10px; padding: 10px; border-radius: 6px; display: none;"></div>
    `;
  } else if (tab === 'users') {
    content.innerHTML = `
      <h3>User Management</h3>
      <div style="margin-bottom: 20px;">
        <input type="text" id="searchUsername" placeholder="Search username..." style="width: 100%; padding: 10px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color); margin-bottom: 10px;">
        <button onclick="searchUsers()" style="width: 100%; padding: 10px; border-radius: 6px; background: #2196F3; color: white; border: none; cursor: pointer;">
          Search
        </button>
      </div>
      
      <div id="userSearchResults" style="max-height: 400px; overflow-y: auto;"></div>
    `;
  } else if (tab === 'rooms') {
    loadRoomManagement();
  }
}

/**
 * Assign badge to user
 */
async function assignBadge() {
  const username = document.getElementById('badgeUsername').value.trim();
  const badge = document.getElementById('badgeSelect').value;
  const resultDiv = document.getElementById('badgeResult');
  
  if (!username) {
    resultDiv.textContent = 'Please enter a username';
    resultDiv.style.display = 'block';
    resultDiv.style.background = '#f44336';
    resultDiv.style.color = 'white';
    return;
  }
  
  try {
    const token = localStorage.getItem('hokeyAuthToken');
    const response = await fetch('/api/admin/assign-badge', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, badge })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      resultDiv.textContent = `✓ Badge "${badge}" assigned to ${username}`;
      resultDiv.style.background = '#4CAF50';
      resultDiv.style.color = 'white';
      document.getElementById('badgeUsername').value = '';
    } else {
      resultDiv.textContent = `Error: ${data.error || 'Failed to assign badge'}`;
      resultDiv.style.background = '#f44336';
      resultDiv.style.color = 'white';
    }
    resultDiv.style.display = 'block';
  } catch (error) {
    resultDiv.textContent = `Error: ${error.message}`;
    resultDiv.style.background = '#f44336';
    resultDiv.style.color = 'white';
    resultDiv.style.display = 'block';
  }
}

/**
 * Remove badge from user
 */
async function removeBadge() {
  const username = document.getElementById('badgeUsername').value.trim();
  const badge = document.getElementById('badgeSelect').value;
  const resultDiv = document.getElementById('badgeResult');
  
  if (!username) {
    resultDiv.textContent = 'Please enter a username';
    resultDiv.style.display = 'block';
    resultDiv.style.background = '#f44336';
    resultDiv.style.color = 'white';
    return;
  }
  
  try {
    const token = localStorage.getItem('hokeyAuthToken');
    const response = await fetch('/api/admin/remove-badge', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, badge })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      resultDiv.textContent = `✓ Badge "${badge}" removed from ${username}`;
      resultDiv.style.background = '#4CAF50';
      resultDiv.style.color = 'white';
      document.getElementById('badgeUsername').value = '';
    } else {
      resultDiv.textContent = `Error: ${data.error || 'Failed to remove badge'}`;
      resultDiv.style.background = '#f44336';
      resultDiv.style.color = 'white';
    }
    resultDiv.style.display = 'block';
  } catch (error) {
    resultDiv.textContent = `Error: ${error.message}`;
    resultDiv.style.background = '#f44336';
    resultDiv.style.color = 'white';
    resultDiv.style.display = 'block';
  }
}

/**
 * Search users
 */
async function searchUsers() {
  const query = document.getElementById('searchUsername').value.trim();
  const resultsDiv = document.getElementById('userSearchResults');
  
  if (!query) {
    resultsDiv.innerHTML = '<p style="text-align: center; opacity: 0.5;">Enter a username to search</p>';
    return;
  }
  
  try {
    const token = localStorage.getItem('hokeyAuthToken');
    const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const users = await response.json();
    
    if (users.length === 0) {
      resultsDiv.innerHTML = '<p style="text-align: center; opacity: 0.5;">No users found</p>';
      return;
    }
    
    resultsDiv.innerHTML = users.map(user => `
      <div style="padding: 15px; border-radius: 8px; background: var(--input-bg); margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${escapeHtml(user.username)}</strong>
            ${user.profile?.badges?.length ? `<br><small>${user.profile.badges.map(b => getBadgeEmojiForChat(b)).join(' ')}</small>` : ''}
          </div>
          <button onclick="deleteUser('${user._id}', '${escapeHtml(user.username)}')" style="padding: 8px 16px; border-radius: 6px; background: #f44336; color: white; border: none; cursor: pointer;">
            Delete User
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    resultsDiv.innerHTML = `<p style="text-align: center; color: #f44336;">Error: ${error.message}</p>`;
  }
}

/**
 * Delete user (Site Admin only)
 */
async function deleteUser(userId, username) {
  if (!confirm(`Are you sure you want to permanently delete user "${username}"? This action cannot be undone.`)) {
    return;
  }
  
  try {
    const token = localStorage.getItem('hokeyAuthToken');
    const response = await fetch(`/api/admin/delete-user/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`User "${username}" has been deleted`);
      searchUsers(); // Refresh results
    } else {
      alert(`Error: ${data.error || 'Failed to delete user'}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

/**
 * Load room management tab
 */
async function loadRoomManagement() {
  const content = document.getElementById('adminTabContent');
  content.innerHTML = '<p style="text-align: center;">Loading rooms...</p>';
  
  try {
    const response = await fetch('/api/rooms');
    const data = await response.json();
    const rooms = data.data || [];
    
    content.innerHTML = `
      <h3>Room Management</h3>
      <div style="max-height: 500px; overflow-y: auto;">
        ${rooms.map(room => `
          <div style="padding: 15px; border-radius: 8px; background: var(--input-bg); margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div>
                <strong>${escapeHtml(room.name)}</strong>
                ${room.description ? `<br><small style="opacity: 0.7;">${escapeHtml(room.description)}</small>` : ''}
                <br><small style="opacity: 0.5;">Created by: ${escapeHtml(room.createdBy || 'Unknown')}</small>
              </div>
              <button onclick="deleteRoom('${room._id}', '${escapeHtml(room.name)}')" style="padding: 8px 16px; border-radius: 6px; background: #f44336; color: white; border: none; cursor: pointer;">
                Delete Room
              </button>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
              <button onclick="assignRoomRole('${escapeHtml(room.name)}', 'admin')" style="flex: 1; padding: 8px; border-radius: 6px; background: #2196F3; color: white; border: none; cursor: pointer; font-size: 0.9em;">
                Assign Admin
              </button>
              <button onclick="assignRoomRole('${escapeHtml(room.name)}', 'moderator')" style="flex: 1; padding: 8px; border-radius: 6px; background: #4CAF50; color: white; border: none; cursor: pointer; font-size: 0.9em;">
                Assign Mod
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    content.innerHTML = `<p style="text-align: center; color: #f44336;">Error loading rooms: ${error.message}</p>`;
  }
}

/**
 * Delete room (Site Admin only)
 */
async function deleteRoom(roomId, roomName) {
  if (!confirm(`Are you sure you want to delete room "${roomName}"? This will delete all messages in this room.`)) {
    return;
  }
  
  try {
    const token = localStorage.getItem('hokeyAuthToken');
    const response = await fetch(`/api/admin/delete-room/${roomId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`Room "${roomName}" has been deleted`);
      loadRoomManagement(); // Refresh
    } else {
      alert(`Error: ${data.error || 'Failed to delete room'}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

/**
 * Assign room role
 */
async function assignRoomRole(roomName, role) {
  const username = prompt(`Enter username to assign as ${role} for "${roomName}":`);
  if (!username) return;
  
  try {
    const token = localStorage.getItem('hokeyAuthToken');
    const response = await fetch('/api/admin/assign-room-role', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, roomName, role })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`${username} is now ${role} of "${roomName}"`);
    } else {
      alert(`Error: ${data.error || 'Failed to assign role'}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

/**
 * Delete message (Moderator action)
 */
async function deleteMessage(messageId, roomName) {
  if (!isModerator(roomName)) {
    alert('Access denied: Moderator privileges required');
    return;
  }
  
  if (!confirm('Delete this message?')) return;
  
  try {
    const token = localStorage.getItem('hokeyAuthToken');
    const response = await fetch(`/api/moderation/delete-message/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ room: roomName })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Remove message from DOM
      const msgElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (msgElement) {
        msgElement.remove();
      }
    } else {
      alert(`Error: ${data.error || 'Failed to delete message'}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

/**
 * Ban user from room (Chat Admin action)
 */
async function banUserFromRoom(username, roomName) {
  if (!isChatAdmin(roomName)) {
    alert('Access denied: Chat Admin privileges required');
    return;
  }
  
  const duration = prompt('Ban duration in hours (leave empty for permanent):');
  
  try {
    const token = localStorage.getItem('hokeyAuthToken');
    const response = await fetch('/api/moderation/ban-user', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        username, 
        roomName, 
        duration: duration ? parseInt(duration) : null 
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`${username} has been banned from "${roomName}"`);
    } else {
      alert(`Error: ${data.error || 'Failed to ban user'}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

/**
 * Ban user from room panel
 */
async function banUserFromRoomPanel(roomName) {
  const username = document.getElementById('banUsername').value.trim();
  const duration = document.getElementById('banDuration').value;
  
  if (!username) {
    alert('Please enter a username');
    return;
  }
  
  if (!confirm(`Ban ${username} from "${roomName}"?`)) return;
  
  try {
    const token = localStorage.getItem('hokeyAuthToken');
    const response = await fetch('/api/moderation/ban-user', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        username, 
        roomName, 
        duration: duration ? parseInt(duration) : null 
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`${username} has been banned from "${roomName}"`);
      document.getElementById('banUsername').value = '';
      document.getElementById('banDuration').value = '';
    } else {
      alert(`Error: ${data.error || 'Failed to ban user'}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

/**
 * Kick user from room panel
 */
async function kickUserFromRoomPanel(roomName) {
  const username = document.getElementById('kickUsername').value.trim();
  
  if (!username) {
    alert('Please enter a username');
    return;
  }
  
  if (!confirm(`Kick ${username} from "${roomName}"?`)) return;
  
  try {
    const token = localStorage.getItem('hokeyAuthToken');
    const response = await fetch('/api/moderation/kick-user', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, roomName })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`${username} has been kicked from "${roomName}"`);
      document.getElementById('kickUsername').value = '';
    } else {
      alert(`Error: ${data.error || 'Failed to kick user'}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

/**
 * Assign room moderator (Chat Admin only)
 */
async function assignRoomModerator(roomName) {
  const username = document.getElementById('modUsername').value.trim();
  
  if (!username) {
    alert('Please enter a username');
    return;
  }
  
  if (!confirm(`Assign ${username} as moderator for "${roomName}"?`)) return;
  
  try {
    const token = localStorage.getItem('hokeyAuthToken');
    const response = await fetch('/api/moderation/assign-moderator', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, roomName })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`${username} is now a moderator of "${roomName}"`);
      document.getElementById('modUsername').value = '';
    } else {
      alert(`Error: ${data.error || 'Failed to assign moderator'}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

// Helper function for escaping HTML (if not already defined)
if (typeof escapeHtml === 'undefined') {
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
