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
        // console.log(`[Socket.IO] Emitted ${event}:`, data);
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
