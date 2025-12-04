# Remote Keyboard Control Implementation Plan

## 🎯 Project Overview

Enable remote keyboard backlight control from a phone by scanning a QR code. The system uses Socket.IO to connect both the host PC (with physical keyboard) and remote phone through a central server.

### Architecture

**Two Modes:**
- **Host Mode (PC):** Connects to physical keyboard via WebHID + Socket.IO server, displays QR code
- **Remote Mode (Phone):** Connects to Socket.IO server only, sends commands remotely

**Data Flow:**
```
HOST (PC) ←→ Socket.IO Server ←→ REMOTE (Phone)
    ↓
Physical Keyboard
```

---

## 📋 Requirements Summary

### Functional Requirements
1. Generate/persist unique UUID per browser session (localStorage)
2. Display QR code after keyboard authorization (Host Mode only)
3. QR code contains full URL: `{VITE_APP_BASE_URL}/?remote={UUID}`
4. Detect mode from URL query parameter: `?remote={UUID}`
5. Socket.IO connection with auto-reconnect
6. Two event types: `brightness:set` (remote → host) and `brightness:sync` (host → remote)
7. Support multiple remotes (latest command wins, no race condition handling needed)
8. Connection status indicator UI
9. No authentication/security required (demo only)

### Technical Requirements
- Socket.IO server URL: configurable via `VITE_SOCKET_SERVER_URL`
- App base URL: configurable via `VITE_APP_BASE_URL`
- No hard-coded URLs
- Auto-reconnect on connection drop
- Audio Radar branding (dark theme, green accents)

---

## 📦 Phase 1: Dependencies & Environment Setup

### 1.1 Install NPM Packages

```bash
npm install socket.io-client qrcode.react
npm install --save-dev @types/qrcode.react
```

**Packages:**
- `socket.io-client`: ^4.x - Socket.IO client library
- `qrcode.react`: ^3.x - React QR code component

### 1.2 Create Environment Files

**File: `.env`**
```env
VITE_SOCKET_SERVER_URL=http://localhost:3000
VITE_APP_BASE_URL=http://localhost:5173
```

**File: `.env.example`**
```env
# Socket.IO server URL (required)
VITE_SOCKET_SERVER_URL=your-socket-server-url

# Application base URL for QR code generation (required)
VITE_APP_BASE_URL=your-app-base-url
```

### 1.3 Update `.gitignore`

Add to `.gitignore` if not present:
```
.env
.env.local
```

---

## 🏗️ Phase 2: Type Definitions

### File: `src/types/socket-events.ts`

```typescript
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
```

---

## 🔧 Phase 3: Utility Functions

### File: `src/utils/uuid.ts`

```typescript
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
```

### File: `src/utils/mode-detection.ts`

```typescript
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
```

---

## 🪝 Phase 4: Custom Hooks

### File: `src/hooks/useUUID.ts`

```typescript
import { useEffect, useState } from 'react';
import { getOrCreateUUID } from '../utils/uuid';

/**
 * Hook to manage UUID for host mode
 * Returns the persisted or newly generated UUID
 */
export function useUUID(): string {
  const [uuid, setUUID] = useState<string>(() => getOrCreateUUID());
  
  useEffect(() => {
    // Ensure UUID is set on mount
    const currentUUID = getOrCreateUUID();
    setUUID(currentUUID);
  }, []);
  
  return uuid;
}
```

### File: `src/hooks/useSocketIO.ts`

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SocketEventHandlers, SocketEventName } from '../types/socket-events';

export interface UseSocketIOOptions {
  uuid: string;
  mode: 'host' | 'remote';
}

export interface UseSocketIOReturn {
  socket: Socket | null;
  isConnected: boolean;
  emit: <K extends SocketEventName>(
    event: K,
    data: Parameters<SocketEventHandlers[K]>[0]
  ) => void;
  on: <K extends SocketEventName>(
    event: K,
    handler: SocketEventHandlers[K]
  ) => void;
  off: <K extends SocketEventName>(event: K, handler?: Function) => void;
}

/**
 * Custom hook for Socket.IO connection management
 * 
 * Features:
 * - Auto-connect to VITE_SOCKET_SERVER_URL
 * - Auto-reconnect on disconnect
 * - Type-safe event emitters/listeners
 * - Connection status tracking
 * - Automatic registration with UUID
 */
export function useSocketIO({ uuid, mode }: UseSocketIOOptions): UseSocketIOReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const handlersRef = useRef<Map<string, Function>>(new Map());

  useEffect(() => {
    const serverURL = import.meta.env.VITE_SOCKET_SERVER_URL;
    
    if (!serverURL) {
      console.error('VITE_SOCKET_SERVER_URL is not defined');
      return;
    }

    console.log(`[Socket.IO] Connecting to ${serverURL} as ${mode} (${uuid})`);

    // Initialize socket connection
    const newSocket = io(serverURL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log(`[Socket.IO] Connected (${mode} mode)`);
      setIsConnected(true);
      
      // Register with server
      if (mode === 'host') {
        newSocket.emit('host:register', { uuid, timestamp: Date.now() });
      } else {
        newSocket.emit('remote:register', { uuid, timestamp: Date.now() });
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Disconnected: ${reason}`);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`[Socket.IO] Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[Socket.IO] Reconnection attempt ${attemptNumber}`);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      console.log('[Socket.IO] Disconnecting...');
      newSocket.disconnect();
      handlersRef.current.clear();
    };
  }, [uuid, mode]);

  // Emit typed events
  const emit = useCallback(
    <K extends SocketEventName>(
      event: K,
      data: Parameters<SocketEventHandlers[K]>[0]
    ) => {
      if (socket && isConnected) {
        socket.emit(event, data);
        console.log(`[Socket.IO] Emitted ${event}:`, data);
      } else {
        console.warn(`[Socket.IO] Cannot emit ${event}: not connected`);
      }
    },
    [socket, isConnected]
  );

  // Listen to typed events
  const on = useCallback(
    <K extends SocketEventName>(event: K, handler: SocketEventHandlers[K]) => {
      if (socket) {
        socket.on(event, handler as any);
        handlersRef.current.set(event, handler as Function);
        console.log(`[Socket.IO] Registered listener for ${event}`);
      }
    },
    [socket]
  );

  // Remove event listeners
  const off = useCallback(
    <K extends SocketEventName>(event: K, handler?: Function) => {
      if (socket) {
        if (handler) {
          socket.off(event, handler as any);
        } else {
          socket.off(event);
        }
        handlersRef.current.delete(event);
        console.log(`[Socket.IO] Removed listener for ${event}`);
      }
    },
    [socket]
  );

  return {
    socket,
    isConnected,
    emit,
    on,
    off,
  };
}
```

---

## 🎨 Phase 5: UI Components

### File: `src/components/ConnectionStatus.tsx`

```typescript
import styled from 'styled-components';

const StatusContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  background: rgba(18, 24, 40, 0.95);
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 136, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  backdrop-filter: blur(10px);
`;

const StatusDot = styled.div<{ isConnected: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(props) => (props.isConnected ? '#00ff88' : '#ff6b6b')};
  box-shadow: 0 0 10px
    ${(props) =>
      props.isConnected ? 'rgba(0, 255, 136, 0.6)' : 'rgba(255, 107, 107, 0.6)'};
  animation: ${(props) => (props.isConnected ? 'none' : 'pulse 2s infinite')};

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

const StatusText = styled.span<{ isConnected: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.isConnected ? '#00ff88' : '#ff6b6b')};
  text-shadow: 0 0 10px
    ${(props) =>
      props.isConnected
        ? 'rgba(0, 255, 136, 0.3)'
        : 'rgba(255, 107, 107, 0.3)'};
`;

interface ConnectionStatusProps {
  isConnected: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
}) => {
  return (
    <StatusContainer>
      <StatusDot isConnected={isConnected} />
      <StatusText isConnected={isConnected}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </StatusText>
    </StatusContainer>
  );
};
```

### File: `src/components/QRCodeDisplay.tsx`

```typescript
import { QRCodeSVG } from 'qrcode.react';
import styled from 'styled-components';

const QRContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  margin: 20px 0;
  padding: 20px;
  background: rgba(10, 14, 26, 0.6);
  border-radius: 15px;
  border: 1px solid rgba(0, 255, 136, 0.3);
  box-shadow: 0 4px 15px rgba(0, 255, 136, 0.2);
`;

const QRCodeWrapper = styled.div`
  padding: 15px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
`;

const QRTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #00ff88;
  text-align: center;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
`;

const QRSubtitle = styled.div`
  font-size: 14px;
  color: #8899aa;
  text-align: center;
`;

interface QRCodeDisplayProps {
  url: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url }) => {
  return (
    <QRContainer>
      <QRTitle>📱 Scan to Control Remotely</QRTitle>
      <QRCodeWrapper>
        <QRCodeSVG
          value={url}
          size={200}
          level="M"
          includeMargin={false}
        />
      </QRCodeWrapper>
      <QRSubtitle>Scan with your phone to control brightness remotely</QRSubtitle>
    </QRContainer>
  );
};
```

---

## 🔄 Phase 6: Refactor KeyboardDemo Component

### File: `src/components/KeyboardDemo.tsx`

**Key Changes:**

1. **Add imports:**
```typescript
import { useSocketIO } from '../hooks/useSocketIO';
import { useUUID } from '../hooks/useUUID';
import { detectMode, generateRemoteURL } from '../utils/mode-detection';
import { QRCodeDisplay } from './QRCodeDisplay';
import { ConnectionStatus } from './ConnectionStatus';
import type { BrightnessSetEvent, BrightnessSyncEvent } from '../types/socket-events';
```

2. **Add styled components:**
```typescript
const ModeIndicator = styled.div<{ mode: 'host' | 'remote' }>`
  display: inline-block;
  padding: 8px 16px;
  margin-bottom: 20px;
  background: ${(props) =>
    props.mode === 'host'
      ? 'rgba(0, 255, 136, 0.15)'
      : 'rgba(136, 136, 255, 0.15)'};
  border: 1px solid
    ${(props) =>
      props.mode === 'host'
        ? 'rgba(0, 255, 136, 0.3)'
        : 'rgba(136, 136, 255, 0.3)'};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.mode === 'host' ? '#00ff88' : '#8888ff')};
  text-transform: uppercase;
  letter-spacing: 1px;
`;
```

3. **Component logic structure:**

```typescript
export const KeyboardDemo = () => {
  // 1. Mode Detection
  const { mode, remoteUUID } = detectMode();
  
  // 2. UUID Management
  const hostUUID = useUUID(); // Only used in host mode
  const activeUUID = mode === 'host' ? hostUUID : remoteUUID!;
  
  // 3. Socket.IO Connection
  const { socket, isConnected, emit, on, off } = useSocketIO({
    uuid: activeUUID,
    mode,
  });
  
  // 4. Existing state (keep all existing state)
  const dispatch = useAppDispatch();
  const connectedDevices = useAppSelector(getConnectedDevices);
  const [brightness, setBrightness] = useState(128);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardAPI, setKeyboardAPI] = useState<KeyboardAPI | null>(null);
  const [brightnessType, setBrightnessType] = useState<'qmk_rgblight' | 'backlight' | null>(null);
  
  const devicesList = Object.values(connectedDevices);
  const device = devicesList[0];
  
  // 5. Socket Event Handlers (see detailed implementation below)
  // 6. Existing effects (keep existing useEffects)
  // 7. Existing handlers with socket integration
  // 8. Render logic with mode-specific UI
};
```

4. **Socket Event Handlers (add after state declarations):**

```typescript
// Host Mode: Listen for remote brightness changes
useEffect(() => {
  if (mode === 'host' && isConnected) {
    const handleBrightnessSet = (data: BrightnessSetEvent) => {
      if (data.uuid === hostUUID) {
        console.log('[Host] Received brightness:set from remote:', data.brightness);
        setBrightness(data.brightness);
        
        // Apply to physical keyboard if connected
        if (keyboardAPI && brightnessType) {
          const lightingValue =
            brightnessType === 'backlight'
              ? LightingValue.BACKLIGHT_BRIGHTNESS
              : LightingValue.QMK_RGBLIGHT_BRIGHTNESS;
          
          keyboardAPI.setBacklightValue(lightingValue, data.brightness)
            .then(() => {
              console.log('[Host] Applied remote brightness to keyboard');
            })
            .catch((err) => {
              console.error('[Host] Failed to apply brightness:', err);
            });
        }
      }
    };
    
    on('brightness:set', handleBrightnessSet);
    
    return () => {
      off('brightness:set', handleBrightnessSet);
    };
  }
}, [mode, isConnected, hostUUID, keyboardAPI, brightnessType, on, off]);

// Remote Mode: Listen for host brightness sync
useEffect(() => {
  if (mode === 'remote' && isConnected) {
    const handleBrightnessSync = (data: BrightnessSyncEvent) => {
      if (data.uuid === remoteUUID) {
        console.log('[Remote] Received brightness:sync from host:', data);
        setBrightness(data.brightness);
        setBrightnessType(data.brightnessType);
      }
    };
    
    on('brightness:sync', handleBrightnessSync);
    
    return () => {
      off('brightness:sync', handleBrightnessSync);
    };
  }
}, [mode, isConnected, remoteUUID, on, off]);
```

5. **Update handleBrightnessChange:**

```typescript
const handleBrightnessChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const newBrightness = parseInt(e.target.value);
  setBrightness(newBrightness);
  
  if (mode === 'host') {
    // Host Mode: Apply to keyboard and emit sync
    if (keyboardAPI) {
      try {
        const lightingValue =
          brightnessType === 'backlight'
            ? LightingValue.BACKLIGHT_BRIGHTNESS
            : LightingValue.QMK_RGBLIGHT_BRIGHTNESS;
        
        await keyboardAPI.setBacklightValue(lightingValue, newBrightness);
        console.log('[Host] Brightness set successfully');
        setError(null);
        
        // Emit sync to remotes
        if (isConnected) {
          emit('brightness:sync', {
            uuid: hostUUID,
            brightness: newBrightness,
            brightnessType: brightnessType!,
          });
        }
      } catch (err) {
        console.error('[Host] Failed to set brightness:', err);
        // ... existing fallback logic
      }
    }
  } else {
    // Remote Mode: Emit set command to host
    if (isConnected) {
      emit('brightness:set', {
        uuid: remoteUUID!,
        brightness: newBrightness,
      });
      console.log('[Remote] Emitted brightness:set');
    }
  }
};
```

6. **Update render logic:**

```typescript
return (
  <DemoContainer>
    <ConnectionStatus isConnected={isConnected} />
    
    <Card>
      <ModeIndicator mode={mode}>
        {mode === 'host' ? '🖥️ Host Mode' : '📱 Remote Control Mode'}
      </ModeIndicator>
      
      <Title>USB Keyboard Control Demo</Title>
      <Subtitle>
        {mode === 'host'
          ? "Control your keyboard's backlight directly from the web"
          : 'Controlling keyboard remotely'}
      </Subtitle>
      
      {mode === 'host' ? (
        // HOST MODE UI
        <>
          {!device ? (
            <>
              <Button onClick={handleAuthorize} disabled={isAuthorizing}>
                {isAuthorizing ? 'Authorizing...' : 'Authorize Keyboard'}
              </Button>
              <StatusMessage type="info">
                Click the button above to connect your compatible keyboard
              </StatusMessage>
            </>
          ) : (
            <>
              {/* QR Code Display */}
              <QRCodeDisplay url={generateRemoteURL(hostUUID)} />
              
              {/* Device Info */}
              <DeviceInfo>
                <DeviceName>{device.productName || 'Connected Keyboard'}</DeviceName>
                <DeviceDetails>
                  VID: 0x{device.vendorId.toString(16).padStart(4, '0').toUpperCase()} | 
                  PID: 0x{device.productId.toString(16).padStart(4, '0').toUpperCase()}
                </DeviceDetails>
                <DeviceDetails>
                  Protocol: v{device.protocol} | {device.requiredDefinitionVersion.toUpperCase()}
                </DeviceDetails>
                {brightnessType && (
                  <DeviceDetails style={{ marginTop: '5px', color: '#00ff88', textShadow: '0 0 10px rgba(0, 255, 136, 0.5)' }}>
                    ✓ Using {brightnessType === 'qmk_rgblight' ? 'QMK RGB Light' : 'Standard Backlight'}
                  </DeviceDetails>
                )}
              </DeviceInfo>
              
              {/* Brightness Slider */}
              <SliderContainer>
                <SliderLabel>
                  <LabelText>Backlight Brightness</LabelText>
                  <BrightnessValue>{brightnessPercentage}%</BrightnessValue>
                </SliderLabel>
                <Slider
                  type="range"
                  min="0"
                  max="255"
                  value={brightness}
                  onChange={handleBrightnessChange}
                />
              </SliderContainer>
              
              <Button onClick={handleAuthorize} style={{ marginTop: '20px' }}>
                Connect Different Keyboard
              </Button>
            </>
          )}
        </>
      ) : (
        // REMOTE MODE UI
        <>
          <StatusMessage type="info">
            Connected to host keyboard remotely
          </StatusMessage>
          
          <SliderContainer>
            <SliderLabel>
              <LabelText>Backlight Brightness</LabelText>
              <BrightnessValue>{brightnessPercentage}%</BrightnessValue>
            </SliderLabel>
            <Slider
              type="range"
              min="0"
              max="255"
              value={brightness}
              onChange={handleBrightnessChange}
            />
          </SliderContainer>
          
          {!isConnected && (
            <StatusMessage type="error">
              Unable to connect to server. Please check your connection.
            </StatusMessage>
          )}
        </>
      )}
      
      {error && <StatusMessage type="error">{error}</StatusMessage>}
    </Card>
  </DemoContainer>
);
```

---

## ✅ Implementation Checklist

### Phase 1: Setup
- [ ] Install `socket.io-client` package
- [ ] Install `qrcode.react` package and types
- [ ] Create `.env` file with both VITE variables
- [ ] Create `.env.example` file
- [ ] Add `.env` to `.gitignore` if not present

### Phase 2: Types
- [ ] Create `src/types/socket-events.ts`
- [ ] Define all event interfaces
- [ ] Export type-safe event handlers

### Phase 3: Utilities
- [ ] Create `src/utils/uuid.ts`
  - [ ] Implement `generateUUID()`
  - [ ] Implement `getOrCreateUUID()`
  - [ ] Implement `clearUUID()`
- [ ] Create `src/utils/mode-detection.ts`
  - [ ] Implement `detectMode()`
  - [ ] Implement `generateRemoteURL()`

### Phase 4: Hooks
- [ ] Create `src/hooks/useUUID.ts`
  - [ ] Implement UUID state management
- [ ] Create `src/hooks/useSocketIO.ts`
  - [ ] Implement socket connection
  - [ ] Add auto-reconnect logic
  - [ ] Add type-safe emit/on/off methods
  - [ ] Add connection event handlers

### Phase 5: Components
- [ ] Create `src/components/ConnectionStatus.tsx`
  - [ ] Style with Audio Radar theme
  - [ ] Add connection indicator
  - [ ] Add pulse animation for disconnected state
- [ ] Create `src/components/QRCodeDisplay.tsx`
  - [ ] Integrate qrcode.react
  - [ ] Style with Audio Radar theme
  - [ ] Add title and subtitle

### Phase 6: KeyboardDemo Refactor
- [ ] Import new utilities and components
- [ ] Add mode detection logic
- [ ] Add Socket.IO integration
- [ ] Add styled components for mode indicator
- [ ] Implement host mode socket handlers
- [ ] Implement remote mode socket handlers
- [ ] Update `handleBrightnessChange` with socket logic
- [ ] Update render with mode-specific UI
- [ ] Test host mode flow
- [ ] Test remote mode flow

### Phase 7: Testing
- [ ] Test UUID generation and persistence
- [ ] Test mode detection (with/without query param)
- [ ] Test QR code generation
- [ ] Test host mode: keyboard authorization
- [ ] Test host mode: brightness changes sync to remote
- [ ] Test remote mode: brightness changes apply to host
- [ ] Test connection status indicator
- [ ] Test auto-reconnect behavior
- [ ] Test multiple remotes (optional)

---

## 🚀 Build & Deployment

### Environment Variables

At build time, set these environment variables:

```bash
# Development
VITE_SOCKET_SERVER_URL=http://localhost:3000
VITE_APP_BASE_URL=http://localhost:5173

# Production
VITE_SOCKET_SERVER_URL=https://your-socket-server.com
VITE_APP_BASE_URL=https://your-app.com
```

### Build Command

```bash
npm run build
```

The build will use the environment variables from `.env` or your CI/CD pipeline.

---

## 📊 Socket.IO Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Socket.IO Server                        │
│                    (Not implemented yet)                     │
└─────────────────────────────────────────────────────────────┘
         ↑                                        ↑
         │                                        │
    brightness:sync                         brightness:set
    (host → remote)                        (remote → host)
         │                                        │
         ↓                                        ↓
┌──────────────────────┐              ┌──────────────────────┐
│    HOST (PC)         │              │   REMOTE (Phone)     │
│                      │              │                      │
│  1. Authorize KB     │              │  1. Scan QR code     │
│  2. Generate UUID    │              │  2. Parse UUID       │
│  3. Show QR code     │              │  3. Connect socket   │
│  4. Connect socket   │              │  4. Show UI          │
│  5. Emit sync        │              │  5. Emit set         │
│  6. Listen set       │              │  6. Listen sync      │
│                      │              │                      │
│  Physical Keyboard   │              │   No Keyboard        │
│        ↕             │              │                      │
└──────────────────────┘              └──────────────────────┘
```

---

## 🔍 Troubleshooting Guide

### Issue: QR Code Not Showing
- **Check:** Device is authorized in host mode
- **Check:** UUID is generated successfully
- **Check:** `VITE_APP_BASE_URL` is set correctly

### Issue: Socket Not Connecting
- **Check:** `VITE_SOCKET_SERVER_URL` is set correctly
- **Check:** Server is running and accessible
- **Check:** No CORS issues (server must allow origin)
- **Check:** Browser console for connection errors

### Issue: Remote Not Controlling Keyboard
- **Check:** UUIDs match between host and remote
- **Check:** Both clients connected to same server
- **Check:** Check browser console for event logs
- **Check:** Host has keyboard authorized and connected

### Issue: Connection Keeps Dropping
- **Check:** Server is stable and not timing out
- **Check:** Network connection is stable
- **Check:** Check auto-reconnect is working (see logs)

---

## 📝 Notes

1. **Server Implementation:** This plan covers only the client-side. The Socket.IO server needs to be implemented separately to route events between clients with matching UUIDs.

2. **Security:** No authentication is implemented as this is a demo. In production, you should add proper authentication and UUID validation.

3. **Multiple Remotes:** The system supports multiple remotes connecting to the same host. The latest command from any remote will take precedence. No race condition handling is implemented.

4. **Browser Compatibility:** Ensure target browsers support WebHID API (Chromium-based browsers) for host mode. Remote mode works on any modern browser.

5. **Storage:** UUID is stored in localStorage. If localStorage is cleared, a new UUID will be generated and the old QR codes will no longer work.

---

## 🎯 Success Criteria

The implementation is complete when:

- ✅ Host mode generates and displays QR code after keyboard authorization
- ✅ Remote mode loads when scanning QR code
- ✅ Brightness changes in host mode sync to all remotes
- ✅ Brightness changes in remote mode apply to host's physical keyboard
- ✅ Connection status is visible in both modes
- ✅ Auto-reconnect works when connection drops
- ✅ No hard-coded URLs (all use Vite env variables)
- ✅ Audio Radar branding maintained throughout

---

**End of Implementation Plan**
