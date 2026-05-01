import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiService } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const token = apiService.getAccessToken();
    if (!token) return;

    const userName = user?.name || 'User';

    const socket = io(SOCKET_URL, {
      auth: { token, userName },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.name]);

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }, []);

  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    socketRef.current?.off(event, handler);
  }, []);

  return { socket: socketRef.current, emit, on, off };
}
