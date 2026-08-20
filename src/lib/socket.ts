import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL, TOKEN_STORAGE_KEY } from '../api/client';

let socket: Socket | null = null;

export function getAdminNotificationsSocket(): Socket | null {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return null;

  if (!socket) {
    socket = io(`${API_BASE_URL}/admin-notifications`, {
      auth: { token },
      transports: ['websocket'],
    });
  }
  return socket;
}

export function disconnectAdminNotificationsSocket() {
  socket?.disconnect();
  socket = null;
}
