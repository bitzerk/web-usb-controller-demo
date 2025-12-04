/**
 * UUID generation and persistence for keyboard control sessions
 */

const UUID_STORAGE_KEY = 'keyboard-control-uuid';

/**
 * Generate a new UUID using crypto.randomUUID() with fallback
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get existing UUID from localStorage or generate new one
 */
export function getOrCreateUUID(): string {
  try {
    const stored = localStorage.getItem(UUID_STORAGE_KEY);
    if (stored) {
      return stored;
    }
    
    const newUUID = generateUUID();
    localStorage.setItem(UUID_STORAGE_KEY, newUUID);
    return newUUID;
  } catch (error) {
    console.error('Failed to access localStorage:', error);
    // Generate temporary UUID if localStorage fails
    return generateUUID();
  }
}

/**
 * Clear stored UUID (for testing/debugging)
 */
export function clearUUID(): void {
  try {
    localStorage.removeItem(UUID_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear UUID:', error);
  }
}
