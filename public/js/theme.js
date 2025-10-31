// Shared theme management module
// Handles theme selection across the application

// Available themes
const themes = {
  light: {
    '--bg-color': '#fff',
    '--text-color': '#222',
    '--header-color': '#222',
    '--user-list-bg': '#f0f0f0',
    '--messages-bg': '#fafafa',
    '--button-bg': '#007bff',
    '--button-text': '#fff',
    '--side-menu-bg': '#f9f9f9',
    '--room-item-hover': '#e9e9e9',
    '--room-card-bg': '#f9f9f9',
    '--room-card-hover': '#e9e9e9'
  },
  dark: {
    '--bg-color': '#222',
    '--text-color': '#fff',
    '--header-color': '#fff',
    '--user-list-bg': '#333',
    '--messages-bg': '#222',
    '--button-bg': '#8e44ad',
    '--button-text': '#fff',
    '--side-menu-bg': '#1a1a1a',
    '--room-item-hover': '#333',
    '--room-card-bg': '#333',
    '--room-card-hover': '#444'
  },
  blue: {
    '--bg-color': '#e3f2fd',
    '--text-color': '#0d47a1',
    '--header-color': '#1565c0',
    '--user-list-bg': '#bbdefb',
    '--messages-bg': '#e3f2fd',
    '--button-bg': '#1976d2',
    '--button-text': '#fff',
    '--side-menu-bg': '#bbdefb',
    '--room-item-hover': '#90caf9',
    '--room-card-bg': '#bbdefb',
    '--room-card-hover': '#90caf9'
  },
  purple: {
    '--bg-color': '#f3e5f5',
    '--text-color': '#4a148c',
    '--header-color': '#6a1b9a',
    '--user-list-bg': '#e1bee7',
    '--messages-bg': '#f3e5f5',
    '--button-bg': '#8e24aa',
    '--button-text': '#fff',
    '--side-menu-bg': '#e1bee7',
    '--room-item-hover': '#ce93d8',
    '--room-card-bg': '#e1bee7',
    '--room-card-hover': '#ce93d8'
  },
  green: {
    '--bg-color': '#e8f5e9',
    '--text-color': '#1b5e20',
    '--header-color': '#2e7d32',
    '--user-list-bg': '#c8e6c9',
    '--messages-bg': '#e8f5e9',
    '--button-bg': '#43a047',
    '--button-text': '#fff',
    '--side-menu-bg': '#c8e6c9',
    '--room-item-hover': '#a5d6a7',
    '--room-card-bg': '#c8e6c9',
    '--room-card-hover': '#a5d6a7'
  },
  sunset: {
    '--bg-color': '#fff3e0',
    '--text-color': '#e65100',
    '--header-color': '#ef6c00',
    '--user-list-bg': '#ffe0b2',
    '--messages-bg': '#fff3e0',
    '--button-bg': '#ff6f00',
    '--button-text': '#fff',
    '--side-menu-bg': '#ffe0b2',
    '--room-item-hover': '#ffcc80',
    '--room-card-bg': '#ffe0b2',
    '--room-card-hover': '#ffcc80'
  },
  midnight: {
    '--bg-color': '#0a0e27',
    '--text-color': '#b8c5d6',
    '--header-color': '#e0e7ff',
    '--user-list-bg': '#151b3d',
    '--messages-bg': '#0a0e27',
    '--button-bg': '#4c51bf',
    '--button-text': '#fff',
    '--side-menu-bg': '#0f1228',
    '--room-item-hover': '#1e2544',
    '--room-card-bg': '#151b3d',
    '--room-card-hover': '#1e2544'
  }
};

let currentTheme = localStorage.getItem('hokeyTheme') || 'dark';

/**
 * Apply a theme by name
 */
function applyTheme(themeName) {
  if (!themes[themeName]) {
    console.error(`Theme "${themeName}" not found`);
    return;
  }
  
  const theme = themes[themeName];
  for (const [property, value] of Object.entries(theme)) {
    document.documentElement.style.setProperty(property, value);
  }
  
  currentTheme = themeName;
  localStorage.setItem('hokeyTheme', themeName);
  
  // Update theme button text if using old toggle button
  updateThemeButton();
}

/**
 * Toggle between light and dark theme (legacy)
 */
function toggleTheme() {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
}

/**
 * Update theme button icon
 */
function updateThemeButton() {
  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) {
    const icon = currentTheme === 'light' ? '🌙' : '☀️';
    toggleBtn.textContent = icon;
  }
}

/**
 * Initialize theme on page load
 */
function initializeTheme() {
  applyTheme(currentTheme);
}

/**
 * Get current theme name
 */
function getCurrentTheme() {
  return currentTheme;
}

/**
 * Get all available themes
 */
function getAvailableThemes() {
  return Object.keys(themes);
}
