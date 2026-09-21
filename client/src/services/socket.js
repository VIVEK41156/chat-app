import { io } from 'socket.io-client';

const getSocketUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
  if (typeof window !== 'undefined' && window.location.port === '3000') {
    return 'http://localhost:5000';
  }
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
};

export const createSocketConnection = (userId) => {
  const socketUrl = getSocketUrl();
  const socket = io(socketUrl, {
    query: { userId: userId || '' },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to', socketUrl, 'with ID:', socket.id, 'for user:', userId);
    if (userId) {
      socket.emit('user:join', userId);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason, 'for user:', userId);
  });

  return socket;
};

