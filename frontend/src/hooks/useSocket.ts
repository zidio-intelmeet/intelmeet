import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

let envUrl = import.meta.env.VITE_API_URL;
if (envUrl === 'http://localhost:3000') {
  envUrl = 'http://localhost:3001'; // Force correct port if env is stale
}
const SOCKET_URL = envUrl || 'http://localhost:3001';

/**
 * Custom hook for Socket.io connection management
 * Handles connection lifecycle and event subscription
 */
export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  // We keep a ref to the socket internally to allow stable emit/on/off callback references
  const socketRef = useRef<Socket | null>(null);
  socketRef.current = socket;

  useEffect(() => {
    if (!user || !accessToken) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const socketInstance = io(SOCKET_URL, {
      query: {
        userId: user.id,
        tenantId: user.tenantId,
      },
      auth: {
        token: accessToken,
      },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    setSocket(socketInstance);
    setIsConnected(socketInstance.connected);

    socketInstance.on('connect', () => {
      console.log('✅ [Socket] Connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('❌ [Socket] Connection error:', err);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 [Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user, accessToken]);

  // Emit event to socket
  const emit = useCallback((event: string, data?: unknown) => {
    if (!socketRef.current) {
      console.warn(`⚠️ [Socket] Cannot emit "${event}" - socket not connected`);
      return;
    }
    socketRef.current.emit(event, data);
  }, []);

  // Subscribe to event
  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (!socketRef.current) {
      console.warn(`⚠️ [Socket] Cannot subscribe to "${event}" - socket not connected`);
      return () => {};
    }
    const currentSocket = socketRef.current;
    currentSocket.on(event, handler);
    return () => {
      currentSocket.off(event, handler);
    };
  }, []);

  // Unsubscribe from event
  const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
    socketRef.current?.off(event, handler);
  }, []);

  return {
    socket,
    emit,
    on,
    off,
    isConnected,
  };
}
