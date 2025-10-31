/**
 * Profile Management Frontend Logic
 * Handles user profile display and updates
 */

/**
 * Load user profile
 */
async function loadUserProfile() {
  try {
    const response = await fetch('/api/users/profile', {
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load profile');
    }

    return data.data.user;
  } catch (error) {
    console.error('Load profile error:', error);
    return null;
  }
}

/**
 * Update user profile
 */
async function updateProfile(updates) {
  try {
    const response = await fetch('/api/users/profile', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update profile');
    }

    saveCurrentUser(data.data.user);
    return data.data.user;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
}

/**
 * Update user status
 */
async function updateStatus(status) {
  try {
    const response = await fetch('/api/users/status', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update status');
    }

    // Also emit socket event
    if (window.socket) {
      socket.emit('update status', status);
    }

    return data.data.user;
  } catch (error) {
    console.error('Update status error:', error);
    throw error;
  }
}

/**
 * Update custom status message
 */
async function updateCustomStatus(customStatus) {
  try {
    const updates = { customStatus };
    const user = await updateProfile(updates);

    // Also emit socket event
    if (window.socket) {
      socket.emit('update custom status', customStatus);
    }

    return user;
  } catch (error) {
    console.error('Update custom status error:', error);
    throw error;
  }
}

/**
 * Set Gravatar as avatar
 */
async function setGravatarAvatar() {
  try {
    const response = await fetch('/api/users/gravatar', {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to set Gravatar');
    }

    saveCurrentUser(data.data.user);
    return data.data.user;
  } catch (error) {
    console.error('Set Gravatar error:', error);
    throw error;
  }
}

/**
 * Display user profile in sidebar
 */
function displayUserProfile(user) {
  const profileSection = document.getElementById('userProfileSection');
  if (!profileSection) return;

  const isGuest = user.isGuest;
  const avatarUrl = user.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`;

  profileSection.innerHTML = `
    <div class="profile-avatar">
      <img src="${avatarUrl}" alt="Avatar" style="width: 80px; height: 80px; border-radius: 50%; display: block; margin: 0 auto 10px;">
    </div>
    
    <div class="profile-info">
      <div class="profile-username" style="text-align: center; font-size: 1.2em; font-weight: bold; margin-bottom: 10px;">
        ${user.username}
        ${isGuest ? '<span style="opacity: 0.6;">(Guest)</span>' : ''}
      </div>
      
      ${!isGuest && user.email ? `
        <div style="text-align: center; font-size: 0.9em; opacity: 0.7; margin-bottom: 10px;">
          ${user.email}
        </div>
      ` : ''}
      
      ${isGuest ? `
        <button onclick="showLoginModal()" style="width: 100%; margin-bottom: 8px;">
          Login
        </button>
        <button onclick="showRegisterModal()" style="width: 100%; margin-bottom: 10px;">
          Register
        </button>
      ` : `
        <button onclick="logout()" style="width: 100%; margin-bottom: 10px; background: #f44336;">
          Logout
        </button>
      `}
    </div>
    
    <div class="profile-status" style="margin-top: 15px;">
      <label style="display: block; margin-bottom: 5px;">Status:</label>
      <select id="statusSelect" onchange="handleStatusChange(this.value)" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color);">
        <option value="online" ${user.profile?.status === 'online' ? 'selected' : ''}>🟢 Online</option>
        <option value="away" ${user.profile?.status === 'away' ? 'selected' : ''}>🟡 Away</option>
        <option value="dnd" ${user.profile?.status === 'dnd' ? 'selected' : ''}>🔴 Do Not Disturb</option>
        <option value="invisible" ${user.profile?.status === 'invisible' ? 'selected' : ''}>⚫ Invisible</option>
      </select>
    </div>
    
    <div class="profile-custom-status" style="margin-top: 15px;">
      <label style="display: block; margin-bottom: 5px;">Custom Status:</label>
      <input 
        type="text" 
        id="customStatusInput" 
        value="${user.profile?.customStatus || ''}" 
        placeholder="Playing chess..."
        maxlength="100"
        onblur="handleCustomStatusUpdate(this.value)"
        style="width: 100%; padding: 8px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color);">
    </div>
    
    ${!isGuest ? `
      <div class="profile-bio" style="margin-top: 15px;">
        <label style="display: block; margin-bottom: 5px;">Bio:</label>
        <textarea 
          id="bioInput" 
          placeholder="Tell us about yourself..."
          maxlength="500"
          onblur="handleBioUpdate(this.value)"
          style="width: 100%; padding: 8px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color); min-height: 80px; resize: vertical;"
        >${user.profile?.bio || ''}</textarea>
      </div>
      
      ${user.profile?.badges && user.profile.badges.length > 0 ? `
        <div class="profile-badges" style="margin-top: 15px;">
          <label style="display: block; margin-bottom: 5px;">Badges:</label>
          <div style="display: flex; gap: 5px; flex-wrap: wrap;">
            ${user.profile.badges.map(badge => `<span class="badge badge-${badge}">${getBadgeEmoji(badge)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      
      <hr style="border: none; border-top: 1px solid var(--border-color); margin: 15px 0;">
      
      <div class="profile-friends" style="margin-top: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <label style="margin: 0;">Friends:</label>
          <button onclick="showAddFriendModal()" style="padding: 4px 12px; border-radius: 4px; background: #4CAF50; color: white; border: none; cursor: pointer; font-size: 0.9em;">
            ➕ Add Friend
          </button>
        </div>
        <div id="friendsList" style="max-height: 150px; overflow-y: auto;">
          <div style="text-align: center; opacity: 0.5; padding: 10px;">Loading friends...</div>
        </div>
      </div>
      
      <hr style="border: none; border-top: 1px solid var(--border-color); margin: 15px 0;">
      
      <div class="profile-settings" style="margin-top: 15px;">
        <label style="display: block; margin-bottom: 10px;">Settings:</label>
        <button onclick="showSettingsModal()" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--button-bg); color: var(--text-color); border: 1px solid var(--border-color); cursor: pointer;">
          ⚙️ Manage Settings
        </button>
      </div>
      
      <div class="profile-joined" style="margin-top: 15px; font-size: 0.9em; opacity: 0.7; text-align: center;">
        Joined ${new Date(user.createdAt).toLocaleDateString()}
      </div>
    ` : ''}
  `;
  
  // Load friends list if user is not a guest
  if (!isGuest) {
    setTimeout(() => loadFriendsList(), 100);
  }
}

/**
 * Get badge emoji
 */
function getBadgeEmoji(badge) {
  const badges = {
    'founder': '👑',
    'moderator': '🛡️',
    'vip': '⭐',
    'contributor': '💎',
    'verified': '✓',
    'premium': '💫'
  };
  return badges[badge] || '🏅';
}

/**
 * Handle status change
 */
async function handleStatusChange(status) {
  try {
    await updateStatus(status);
    console.log('Status updated to:', status);
  } catch (error) {
    alert('Failed to update status');
    console.error(error);
  }
}

/**
 * Handle custom status update
 */
async function handleCustomStatusUpdate(customStatus) {
  try {
    await updateCustomStatus(customStatus);
    console.log('Custom status updated');
  } catch (error) {
    console.error('Failed to update custom status:', error);
  }
}

/**
 * Handle bio update
 */
async function handleBioUpdate(bio) {
  try {
    await updateProfile({ bio });
    console.log('Bio updated');
  } catch (error) {
    console.error('Failed to update bio:', error);
  }
}

/**
 * Show upgrade modal
 */
function showUpgradeModal() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div style="background: var(--bg-color); padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">
      <h2 style="margin-top: 0;">Create Your Account</h2>
      <p style="opacity: 0.8; margin-bottom: 20px;">Upgrade your guest account to keep your chat history and unlock all features!</p>
      
      <form id="upgradeForm" onsubmit="handleUpgrade(event)">
        <input 
          type="text" 
          id="upgradeUsername" 
          placeholder="Username (optional - keep current: ${getCurrentUser()?.username || 'Guest'})" 
          minlength="2"
          maxlength="30"
          style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color);">
        
        <input 
          type="email" 
          id="upgradeEmail" 
          placeholder="Email" 
          required
          style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color);">
        
        <input 
          type="password" 
          id="upgradePassword" 
          placeholder="Password (min 6 characters)" 
          required
          minlength="6"
          style="width: 100%; padding: 10px; margin-bottom: 20px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color);">
        
        <div style="display: flex; gap: 10px;">
          <button type="button" onclick="this.closest('.modal').remove()" style="flex: 1; background: #666;">Cancel</button>
          <button type="submit" style="flex: 1; background: #4CAF50;">Create Account</button>
        </div>
      </form>
    </div>
  `;
  
  modal.className = 'modal';
  document.body.appendChild(modal);
}

/**
 * Handle upgrade form submission
 */
async function handleUpgrade(event) {
  event.preventDefault();
  
  const username = document.getElementById('upgradeUsername').value.trim();
  const email = document.getElementById('upgradeEmail').value;
  const password = document.getElementById('upgradePassword').value;
  
  try {
    const user = await upgradeGuest(email, password, username || undefined);
    alert('Account created successfully! Welcome to HokeyChat! 🎉\n\nReloading to apply changes...');
    
    // Update current user globally
    window.currentUser = user;
    
    // Reload the page to refresh socket connection with new user
    window.location.reload();
  } catch (error) {
    alert('Failed to create account: ' + error.message);
  }
}

/**
 * Show login modal
 */
function showLoginModal() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div style="background: var(--bg-color); padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">
      <h2 style="margin-top: 0;">Login</h2>
      
      <form id="loginForm" onsubmit="handleLogin(event)">
        <input 
          type="text" 
          id="loginIdentifier" 
          placeholder="Email or Username" 
          required
          style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color);">
        
        <input 
          type="password" 
          id="loginPassword" 
          placeholder="Password" 
          required
          style="width: 100%; padding: 10px; margin-bottom: 20px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color);">
        
        <div style="display: flex; gap: 10px;">
          <button type="button" onclick="this.closest('.modal').remove()" style="flex: 1; background: #666;">Cancel</button>
          <button type="submit" style="flex: 1; background: #2196F3;">Login</button>
        </div>
      </form>
      
      <p style="text-align: center; margin-top: 15px; opacity: 0.7;">
        Don't have an account? <a href="#" onclick="showRegisterModal(); this.closest('.modal').remove();" style="color: #2196F3;">Register</a>
      </p>
    </div>
  `;
  
  modal.className = 'modal';
  document.body.appendChild(modal);
}

/**
 * Handle login form submission
 */
async function handleLogin(event) {
  event.preventDefault();
  
  const identifier = document.getElementById('loginIdentifier').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const user = await login(identifier, password);
    alert('Welcome back, ' + user.username + '! 🎉');
    document.querySelector('.modal').remove();
    window.location.reload();
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
}

/**
 * Show register modal
 */
function showRegisterModal() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div style="background: var(--bg-color); padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">
      <h2 style="margin-top: 0;">Register</h2>
      
      <form id="registerForm" onsubmit="handleRegister(event)">
        <input 
          type="text" 
          id="registerUsername" 
          placeholder="Username" 
          required
          pattern="[a-zA-Z0-9_\\- ]+"
          title="Username can only contain letters, numbers, underscores, hyphens, and spaces"
          minlength="2"
          maxlength="30"
          style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color);">
        
        <input 
          type="email" 
          id="registerEmail" 
          placeholder="Email" 
          required
          style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color);">
        
        <input 
          type="password" 
          id="registerPassword" 
          placeholder="Password (min 6 characters)" 
          required
          minlength="6"
          style="width: 100%; padding: 10px; margin-bottom: 20px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color);">
        
        <div style="display: flex; gap: 10px;">
          <button type="button" onclick="this.closest('.modal').remove()" style="flex: 1; background: #666;">Cancel</button>
          <button type="submit" style="flex: 1; background: #4CAF50;">Register</button>
        </div>
      </form>
      
      <p style="text-align: center; margin-top: 15px; opacity: 0.7;">
        Already have an account? <a href="#" onclick="showLoginModal(); this.closest('.modal').remove();" style="color: #2196F3;">Login</a>
      </p>
    </div>
  `;
  
  modal.className = 'modal';
  document.body.appendChild(modal);
}

/**
 * Handle register form submission
 */
async function handleRegister(event) {
  event.preventDefault();
  
  const username = document.getElementById('registerUsername').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  
  try {
    const user = await register(username, email, password);
    alert('Account created successfully! Welcome to HokeyChat, ' + user.username + '! 🎉');
    document.querySelector('.modal').remove();
    window.location.reload();
  } catch (error) {
    alert('Registration failed: ' + error.message);
  }
}

/**
 * View another user's profile by username
 */
async function viewUserProfile(username) {
  try {
    const response = await fetch(`/api/users/profile/${encodeURIComponent(username)}`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load user profile');
    }

    showUserProfileModal(data.data.user);
  } catch (error) {
    console.error('View user profile error:', error);
    alert('Failed to load profile: ' + error.message);
  }
}

/**
 * Show user profile in a modal
 */
function showUserProfileModal(user) {
  const isGuest = user.isGuest;
  const avatarUrl = user.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`;

  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div style="background: var(--bg-color); padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0;">User Profile</h2>
        <button onclick="this.closest('.profile-modal').remove()" style="background: #f44336; padding: 8px 16px; border-radius: 6px; cursor: pointer; border: none; color: white;">✕ Close</button>
      </div>
      
      <div class="profile-avatar" style="text-align: center; margin-bottom: 20px;">
        <img src="${avatarUrl}" alt="Avatar" style="width: 120px; height: 120px; border-radius: 50%; display: inline-block;">
      </div>
      
      <div class="profile-info">
        <div class="profile-username" style="text-align: center; font-size: 1.5em; font-weight: bold; margin-bottom: 10px;">
          ${user.username}
          ${isGuest ? '<span style="opacity: 0.6;">(Guest)</span>' : ''}
        </div>
        
        ${!isGuest && user.profile?.status ? `
          <div style="text-align: center; margin-bottom: 10px;">
            <span style="font-size: 1.2em;">
              ${user.profile.status === 'online' ? '🟢' : user.profile.status === 'away' ? '🟡' : user.profile.status === 'dnd' ? '🔴' : '⚫'}
            </span>
            <span style="text-transform: capitalize;">${user.profile.status}</span>
          </div>
        ` : ''}
        
        ${!isGuest && user.profile?.customStatus ? `
          <div style="text-align: center; font-style: italic; opacity: 0.8; margin-bottom: 15px;">
            "${user.profile.customStatus}"
          </div>
        ` : ''}
        
        ${!isGuest && user.profile?.bio ? `
          <div style="margin: 20px 0; padding: 15px; background: var(--input-bg); border-radius: 8px;">
            <strong>Bio:</strong>
            <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${escapeHtml(user.profile.bio)}</p>
          </div>
        ` : ''}
        
        ${!isGuest && user.profile?.badges && user.profile.badges.length > 0 ? `
          <div style="margin: 20px 0;">
            <strong>Badges:</strong>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; font-size: 1.5em;">
              ${user.profile.badges.map(badge => `<span title="${badge}">${getBadgeEmoji(badge)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        
        ${!isGuest ? `
          <div style="margin-top: 20px; text-align: center; opacity: 0.7; font-size: 0.9em;">
            Joined ${new Date(user.createdAt).toLocaleDateString()}
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  modal.className = 'profile-modal';
  document.body.appendChild(modal);
  
  // Close on outside click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

/**
 * Load and display friends list
 */
async function loadFriendsList() {
  const friendsListEl = document.getElementById('friendsList');
  if (!friendsListEl) return;
  
  try {
    const token = getAuthToken();
    if (!token) return;
    
    const response = await fetch('/api/users/friends', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load friends');
    }
    
    const friends = await response.json();
    
    if (friends.length === 0) {
      friendsListEl.innerHTML = '<div style="text-align: center; opacity: 0.5; padding: 10px;">No friends yet</div>';
      return;
    }
    
    // Get online friends
    const onlineResponse = await fetch('/api/users/friends/online', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const onlineFriends = onlineResponse.ok ? await onlineResponse.json() : [];
    const onlineUsernames = onlineFriends.map(f => f.username);
    
    friendsListEl.innerHTML = friends.map(friend => {
      const isOnline = onlineUsernames.includes(friend.username);
      return `
        <div style="display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 6px; background: var(--input-bg); margin-bottom: 5px; cursor: pointer;" onclick="viewUserProfile('${friend.username}')">
          <span style="font-size: 1.2em;">${isOnline ? '🟢' : '⚫'}</span>
          <span style="flex: 1;">${escapeHtml(friend.username)}</span>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading friends:', error);
    friendsListEl.innerHTML = '<div style="text-align: center; opacity: 0.5; padding: 10px;">Error loading friends</div>';
  }
}

/**
 * Show add friend modal
 */
function showAddFriendModal() {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;">
      <div style="background: var(--panel-bg); padding: 30px; border-radius: 12px; max-width: 400px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
        <h2 style="margin: 0 0 20px 0;">Add Friend</h2>
        <input 
          type="text" 
          id="friendUsernameInput" 
          placeholder="Enter username..."
          style="width: 100%; padding: 10px; border-radius: 6px; background: var(--input-bg); color: var(--text-color); border: 1px solid var(--border-color); margin-bottom: 15px;"
        >
        <div id="addFriendError" style="color: #f44336; margin-bottom: 10px; display: none;"></div>
        <div style="display: flex; gap: 10px;">
          <button onclick="handleAddFriend()" style="flex: 1; padding: 10px; border-radius: 6px; background: #4CAF50; color: white; border: none; cursor: pointer;">
            Add Friend
          </button>
          <button onclick="this.closest('div[style*=fixed]').parentElement.remove()" style="flex: 1; padding: 10px; border-radius: 6px; background: #666; color: white; border: none; cursor: pointer;">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Focus input
  setTimeout(() => {
    document.getElementById('friendUsernameInput')?.focus();
  }, 100);
}

/**
 * Handle adding a friend
 */
async function handleAddFriend() {
  const input = document.getElementById('friendUsernameInput');
  const errorEl = document.getElementById('addFriendError');
  const username = input.value.trim();
  
  if (!username) {
    errorEl.textContent = 'Please enter a username';
    errorEl.style.display = 'block';
    return;
  }
  
  try {
    const token = getAuthToken();
    const response = await fetch('/api/users/friends/request', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send friend request');
    }
    
    // Close modal
    document.querySelector('div[style*="fixed"]')?.parentElement.remove();
    
    // Reload friends list
    await loadFriendsList();
    
    alert('Friend request sent!');
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  }
}

/**
 * Show settings modal
 */
function showSettingsModal() {
  const currentUser = JSON.parse(localStorage.getItem('hokeyCurrentUser') || '{}');
  const settings = currentUser.settings || {};
  
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 10000; overflow-y: auto; padding: 20px;">
      <div style="background: var(--panel-bg); padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto;">
        <h2 style="margin: 0 0 20px 0;">⚙️ Settings</h2>
        
        <div style="margin-bottom: 25px;">
          <h3 style="margin: 0 0 10px 0; font-size: 1.1em;">🔔 Notifications</h3>
          <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; cursor: pointer;">
            <input type="checkbox" id="notifMessages" ${settings.notifications?.messages !== false ? 'checked' : ''}>
            <span>Message notifications</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; cursor: pointer;">
            <input type="checkbox" id="notifFriendRequests" ${settings.notifications?.friendRequests !== false ? 'checked' : ''}>
            <span>Friend request notifications</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
            <input type="checkbox" id="notifSounds" ${settings.notifications?.sounds !== false ? 'checked' : ''}>
            <span>Sound effects</span>
          </label>
        </div>
        
        <hr style="border: none; border-top: 1px solid var(--border-color); margin: 20px 0;">
        
        <div style="margin-bottom: 25px;">
          <h3 style="margin: 0 0 10px 0; font-size: 1.1em;">🔒 Privacy</h3>
          <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; cursor: pointer;">
            <input type="checkbox" id="privacyShowStatus" ${settings.privacy?.showStatus !== false ? 'checked' : ''}>
            <span>Show online status</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
            <input type="checkbox" id="privacyShowLastSeen" ${settings.privacy?.showLastSeen !== false ? 'checked' : ''}>
            <span>Show last seen</span>
          </label>
        </div>
        
        <hr style="border: none; border-top: 1px solid var(--border-color); margin: 20px 0;">
        
        <div style="margin-bottom: 25px;">
          <h3 style="margin: 0 0 10px 0; font-size: 1.1em;">🚫 Blocked Users</h3>
          <div id="blockedUsersList" style="max-height: 150px; overflow-y: auto; margin-bottom: 10px;">
            <div style="text-align: center; opacity: 0.5; padding: 10px;">Loading...</div>
          </div>
        </div>
        
        <div id="settingsError" style="color: #f44336; margin-bottom: 10px; display: none;"></div>
        
        <div style="display: flex; gap: 10px;">
          <button onclick="handleSaveSettings()" style="flex: 1; padding: 10px; border-radius: 6px; background: #4CAF50; color: white; border: none; cursor: pointer;">
            💾 Save Settings
          </button>
          <button onclick="this.closest('div[style*=fixed]').parentElement.remove()" style="flex: 1; padding: 10px; border-radius: 6px; background: #666; color: white; border: none; cursor: pointer;">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Load blocked users
  loadBlockedUsers();
}

/**
 * Load blocked users
 */
async function loadBlockedUsers() {
  const blockedListEl = document.getElementById('blockedUsersList');
  if (!blockedListEl) return;
  
  try {
    const token = getAuthToken();
    const response = await fetch('/api/users/blocked', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to load blocked users');
    
    const blockedUsers = await response.json();
    
    if (blockedUsers.length === 0) {
      blockedListEl.innerHTML = '<div style="text-align: center; opacity: 0.5; padding: 10px;">No blocked users</div>';
      return;
    }
    
    blockedListEl.innerHTML = blockedUsers.map(user => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; border-radius: 6px; background: var(--input-bg); margin-bottom: 5px;">
        <span>${escapeHtml(user.username)}</span>
        <button onclick="handleUnblockUser('${user.username}')" style="padding: 4px 10px; border-radius: 4px; background: #f44336; color: white; border: none; cursor: pointer; font-size: 0.9em;">
          Unblock
        </button>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading blocked users:', error);
    blockedListEl.innerHTML = '<div style="text-align: center; opacity: 0.5; padding: 10px;">Error loading blocked users</div>';
  }
}

/**
 * Handle saving settings
 */
async function handleSaveSettings() {
  const errorEl = document.getElementById('settingsError');
  
  try {
    const settings = {
      notifications: {
        messages: document.getElementById('notifMessages').checked,
        friendRequests: document.getElementById('notifFriendRequests').checked,
        sounds: document.getElementById('notifSounds').checked
      },
      privacy: {
        showStatus: document.getElementById('privacyShowStatus').checked,
        showLastSeen: document.getElementById('privacyShowLastSeen').checked
      }
    };
    
    const token = getAuthToken();
    const response = await fetch('/api/users/settings', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ settings })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save settings');
    }
    
    // Update local user data
    const currentUser = JSON.parse(localStorage.getItem('hokeyCurrentUser') || '{}');
    currentUser.settings = settings;
    localStorage.setItem('hokeyCurrentUser', JSON.stringify(currentUser));
    
    // Close modal
    document.querySelector('div[style*="fixed"]')?.parentElement.remove();
    
    alert('Settings saved successfully!');
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  }
}

/**
 * Handle unblocking a user
 */
async function handleUnblockUser(username) {
  if (!confirm(`Unblock ${username}?`)) return;
  
  try {
    const token = getAuthToken();
    const response = await fetch(`/api/users/block/${encodeURIComponent(username)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to unblock user');
    }
    
    // Reload blocked users list
    await loadBlockedUsers();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

