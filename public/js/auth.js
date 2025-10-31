/**
 * Authentication Frontend Logic
 * Handles login, signup, token management, and guest mode
 */

// Token storage
const TOKEN_KEY = 'hokeyAuthToken';
const USER_KEY = 'hokeyCurrentUser';

/**
 * Get stored auth token
 */
function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Save auth token
 */
function saveAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove auth token
 */
function removeAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Get current user from storage
 */
function getCurrentUser() {
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Save current user to storage
 */
function saveCurrentUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * Check if user is guest
 */
function isGuest() {
  const user = getCurrentUser();
  return user && user.isGuest;
}

/**
 * Register new user
 */
async function register(username, email, password) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    // Save token and user
    saveAuthToken(data.data.token);
    saveCurrentUser(data.data.user);

    return data.data.user;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

/**
 * Login user
 */
async function login(identifier, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ identifier, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Save token and user
    saveAuthToken(data.data.token);
    saveCurrentUser(data.data.user);

    return data.data.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Create guest account
 */
async function createGuestAccount(username) {
  try {
    const response = await fetch('/api/auth/guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: username || `Guest${Math.floor(Math.random() * 10000)}` })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Guest creation failed');
    }

    // Save token and user
    saveAuthToken(data.data.token);
    saveCurrentUser(data.data.user);

    return data.data.user;
  } catch (error) {
    console.error('Guest creation error:', error);
    throw error;
  }
}

/**
 * Upgrade guest to full account
 */
async function upgradeGuest(email, password, username) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const body = { email, password };
    if (username) {
      body.username = username;
    }

    const response = await fetch('/api/auth/upgrade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upgrade failed');
    }

    // Update token and user
    saveAuthToken(data.data.token);
    saveCurrentUser(data.data.user);

    return data.data.user;
  } catch (error) {
    console.error('Upgrade error:', error);
    throw error;
  }
}

/**
 * Logout user
 */
async function logout() {
  try {
    const token = getAuthToken();
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    }

    removeAuthToken();
    
    // Reload page to reset state
    window.location.reload();
  } catch (error) {
    console.error('Logout error:', error);
    // Still remove token even if request fails
    removeAuthToken();
    window.location.reload();
  }
}

/**
 * Verify token and get current user
 */
async function verifyToken() {
  try {
    const token = getAuthToken();
    if (!token) {
      return null;
    }

    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      removeAuthToken();
      return null;
    }

    saveCurrentUser(data.data.user);
    return data.data.user;
  } catch (error) {
    console.error('Token verification error:', error);
    removeAuthToken();
    return null;
  }
}

/**
 * Initialize authentication on page load
 */
async function initAuth() {
  const user = await verifyToken();
  
  if (!user) {
    // No valid token - create guest account
    try {
      const guestUser = await createGuestAccount();
      console.log('Created guest account:', guestUser.username);
      return guestUser;
    } catch (error) {
      console.error('Failed to create guest account:', error);
      return null;
    }
  }
  
  console.log('Authenticated as:', user.username, user.isGuest ? '(Guest)' : '(Registered)');
  return user;
}

/**
 * Get authentication headers for fetch requests
 */
function getAuthHeaders() {
  const token = getAuthToken();
  return token ? {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  } : {
    'Content-Type': 'application/json'
  };
}
