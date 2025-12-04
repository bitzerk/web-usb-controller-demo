/**
 * Socket.IO event types for keyboard control
 */

// Event: Remote → Host (set brightness from remote)
export interface BrightnessSetEvent {
  uuid: string;
  brightness: number; // 0-255
}

// Event: Host → Remote (sync brightness state)
export interface BrightnessSyncEvent {
  uuid: string;
  brightness: number; // 0-255
  brightnessType: 'qmk_rgblight' | 'backlight';
}

// Event: Connection status
export interface ConnectionEvent {
  uuid: string;
  timestamp: number;
}

// Type-safe event handlers
export type SocketEventHandlers = {
  'brightness:set': (data: BrightnessSetEvent) => void;
  'brightness:sync': (data: BrightnessSyncEvent) => void;
  'remote:connected': (data: ConnectionEvent) => void;
  'remote:disconnected': (data: ConnectionEvent) => void;
};

// Socket event names (for type checking)
export type SocketEventName = keyof SocketEventHandlers;
