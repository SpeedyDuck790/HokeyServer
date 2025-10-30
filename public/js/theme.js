// Shared theme management module
// Handles light/dark theme toggling across the application

let isDark = localStorage.getItem('hokeyTheme') === 'light' ? false : true;

/**
 * Set theme colors for the application
 * @param {string} bg - Background color
 * @param {string} text - Text color
 * @param {object} options - Optional additional CSS properties to set
 */
function setTheme(bg, text, options = {}) {
  document.documentElement.style.setProperty('--bg-color', bg);
  document.documentElement.style.setProperty('--text-color', text);
  document.documentElement.style.setProperty('--header-color', text);
  
  if (bg === '#222') {
    // Dark mode defaults
    document.documentElement.style.setProperty('--user-list-bg', '#333');
    document.documentElement.style.setProperty('--messages-bg', '#222');
    document.documentElement.style.setProperty('--button-bg', '#8e44ad');
    document.documentElement.style.setProperty('--side-menu-bg', '#1a1a1a');
    document.documentElement.style.setProperty('--room-item-hover', '#333');
    document.documentElement.style.setProperty('--room-card-bg', '#333');
    document.documentElement.style.setProperty('--room-card-hover', '#444');
  } else {
    // Light mode defaults
    document.documentElement.style.setProperty('--user-list-bg', '#f0f0f0');
    document.documentElement.style.setProperty('--messages-bg', '#fafafa');
    document.documentElement.style.setProperty('--button-bg', '#007bff');
    document.documentElement.style.setProperty('--side-menu-bg', '#f9f9f9');
    document.documentElement.style.setProperty('--room-item-hover', '#e9e9e9');
    document.documentElement.style.setProperty('--room-card-bg', '#f9f9f9');
    document.documentElement.style.setProperty('--room-card-hover', '#e9e9e9');
  }
  
  // Apply any additional custom properties
  for (const [property, value] of Object.entries(options)) {
    document.documentElement.style.setProperty(property, value);
  }
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
  isDark = !isDark;
  if (isDark) {
    setTheme('#222', '#fff');
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) toggleBtn.textContent = '☀️';
    localStorage.setItem('hokeyTheme', 'dark');
  } else {
    setTheme('#fff', '#222');
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) toggleBtn.textContent = '🌙';
    localStorage.setItem('hokeyTheme', 'light');
  }
}

/**
 * Initialize theme on page load
 */
function initializeTheme() {
  if (isDark) {
    setTheme('#222', '#fff');
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) toggleBtn.textContent = '☀️';
  } else {
    setTheme('#fff', '#222');
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) toggleBtn.textContent = '🌙';
  }
}

/**
 * Get current theme state
 * @returns {boolean} True if dark mode is active
 */
function isDarkMode() {
  return isDark;
}
