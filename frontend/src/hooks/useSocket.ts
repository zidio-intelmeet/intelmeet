import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Custom hook for Socket.io connection management
 * Handles connection lifecycle and event subscription
 */
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!user || !accessToken) return;

    const socket = io(SOCKET_URL, {
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

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ [Socket] Connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ [Socket] Connection error:', err);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [Socket] Disconnected:', reason);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
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
  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    if (!socketRef.current) {
      console.warn(`⚠️ [Socket] Cannot subscribe to "${event}" - socket not connected`);
      return () => {};
    }
    socketRef.current.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  // Unsubscribe from event
  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    socketRef.current?.off(event, handler);
  }, []);

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    isConnected: socketRef.current?.connected || false,
  };
}
