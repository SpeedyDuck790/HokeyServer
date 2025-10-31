/**
 * Font Size Management
 * Allows users to cycle through small, medium, and large font sizes
 */

const fontSizes = ['small', 'medium', 'large'];
const fontSizeLabels = {
  small: 'S',
  medium: 'M',
  large: 'L'
};

// Get current font size from localStorage or default to medium
function getCurrentFontSize() {
  return localStorage.getItem('fontSize') || 'medium';
}

// Apply font size to body
function applyFontSize(size) {
  // Remove all font size classes
  fontSizes.forEach(s => {
    document.body.classList.remove(`font-${s}`);
  });
  
  // Add the selected size class
  document.body.classList.add(`font-${size}`);
  
  // Save to localStorage
  localStorage.setItem('fontSize', size);
  
  // Update button indicator
  updateFontSizeButton(size);
}

// Update the font size button to show current size
function updateFontSizeButton(size) {
  const button = document.getElementById('fontSizeToggle');
  if (button) {
    button.setAttribute('data-size', fontSizeLabels[size]);
    button.title = `Font Size: ${size.charAt(0).toUpperCase() + size.slice(1)}`;
  }
}

// Cycle through font sizes
function cycleFontSize() {
  const currentSize = getCurrentFontSize();
  const currentIndex = fontSizes.indexOf(currentSize);
  const nextIndex = (currentIndex + 1) % fontSizes.length;
  const nextSize = fontSizes[nextIndex];
  
  applyFontSize(nextSize);
}

// Initialize font size on page load
document.addEventListener('DOMContentLoaded', () => {
  const savedSize = getCurrentFontSize();
  applyFontSize(savedSize);
});
