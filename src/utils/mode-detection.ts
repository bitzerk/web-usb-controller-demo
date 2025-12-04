/**
 * Detect application mode from URL parameters
 */

export type AppMode = 'host' | 'remote';

export interface ModeDetectionResult {
  mode: AppMode;
  remoteUUID?: string;
}

/**
 * Detect if app should run in Host or Remote mode
 * 
 * Host Mode: No query parameters (default)
 * Remote Mode: ?remote={UUID} in URL
 */
export function detectMode(): ModeDetectionResult {
  try {
    const params = new URLSearchParams(window.location.search);
    const remoteUUID = params.get('remote');
    
    if (remoteUUID && remoteUUID.trim()) {
      return {
        mode: 'remote',
        remoteUUID: remoteUUID.trim(),
      };
    }
    
    return {
      mode: 'host',
    };
  } catch (error) {
    console.error('Failed to detect mode:', error);
    // Default to host mode on error
    return {
      mode: 'host',
    };
  }
}

/**
 * Generate remote control URL for QR code
 */
export function generateRemoteURL(uuid: string): string {
  const baseURL = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
  return `${baseURL}/?remote=${encodeURIComponent(uuid)}`;
}
