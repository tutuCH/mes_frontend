import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    this.socket.on('realtime-update', (data) => {
      this.emit('realtime-update', data);
    });

    this.socket.on('spc-update', (data) => {
      this.emit('spc-update', data);
    });
    
    this.socket.on('machine-status', (data) => {
      this.emit('machine-status', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToMachine(deviceId: string) {
    if (this.socket) {
      this.socket.emit('subscribe-machine', { deviceId });
    }
  }

  unsubscribeFromMachine(deviceId: string) {
    if (this.socket) {
      this.socket.emit('unsubscribe-machine', { deviceId });
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event)?.filter(cb => cb !== callback);
    this.listeners.set(event, callbacks || []);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
}

export const socketService = new SocketService();
