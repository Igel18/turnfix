// Debug utility to control debug output based on settings

// Check if debug is enabled
export const isDebugEnabled = (): boolean => {
  // Check localStorage first (for manual testing)
  const localStorageDebug = localStorage.getItem('DEBUG');
  if (localStorageDebug !== null) {
    return localStorageDebug.toLowerCase() === 'true';
  }
  
  // Check URL parameter for debug mode
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('debug') === 'true';
};

// Debug console wrapper that only logs when debug is enabled
export const debugLog = (...args: any[]): void => {
  if (isDebugEnabled()) {
    console.log('[DEBUG]', ...args);
  }
};

// Debug info wrapper for conditional rendering
export const debugInfo = (content: React.ReactNode): React.ReactNode => {
  return isDebugEnabled() ? content : null;
};

// Set debug mode (useful for testing)
export const setDebugMode = (enabled: boolean): void => {
  localStorage.setItem('DEBUG', enabled.toString());
};
