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
        ${user.displayName || user.username}
        ${!isGuest ? '<span style="color: #4CAF50;">✓</span>' : '<span style="opacity: 0.6;">(Guest)</span>'}
      </div>
      
      ${!isGuest ? `
        <div style="text-align: center; font-size: 0.9em; opacity: 0.8; margin-bottom: 15px;">
          @${user.username}
        </div>
      ` : ''}
      
      ${isGuest ? `
        <button onclick="showUpgradeModal()" style="width: 100%; margin-bottom: 10px; background: #4CAF50;">
          🔒 Create Account
        </button>
      ` : `
        <button onclick="logout()" style="width: 100%; margin-bottom: 10px; background: #f44336;">
          🚪 Logout
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
      
      <div class="profile-joined" style="margin-top: 15px; font-size: 0.9em; opacity: 0.7; text-align: center;">
        Joined ${new Date(user.createdAt).toLocaleDateString()}
      </div>
    ` : ''}
  `;
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
  
  const email = document.getElementById('upgradeEmail').value;
  const password = document.getElementById('upgradePassword').value;
  
  try {
    const user = await upgradeGuest(email, password);
    alert('Account created successfully! Welcome to HokeyChat! 🎉');
    document.querySelector('.modal').remove();
    
    // Reload profile
    displayUserProfile(user);
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
          pattern="[a-zA-Z0-9_-]+"
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
