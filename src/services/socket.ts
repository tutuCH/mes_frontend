import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import type { RealtimeUpdateEvent, SPCUpdateEvent, MachineAlertEvent, MachineStatusEvent } from '@/types/api';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

type SocketEventData = RealtimeUpdateEvent | SPCUpdateEvent | MachineAlertEvent | MachineStatusEvent | unknown;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private subscribedMachines: Set<string> = new Set();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  private setConnectionStatus(status: ConnectionStatus) {
    this.connectionStatus = status;
    this.statusListeners.forEach(cb => cb(status));
  }

  connect() {
    if (this.socket?.connected) return;

    this.setConnectionStatus('connecting');

    // Get auth token for WebSocket authentication
    const token = localStorage.getItem('auth_token');

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.setConnectionStatus('connected');
      this.reconnectAttempts = 0;

      // Resubscribe to all machines on reconnection
      this.resubscribeAll();

      toast.success('Connected to real-time server');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      this.setConnectionStatus('disconnected');

      if (reason === 'io server disconnect') {
        // Server disconnected, might need to reauthenticate
        toast.error('Disconnected by server');
      } else if (reason !== 'io client disconnect') {
        toast.warning('Connection lost. Reconnecting...');
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('Unable to connect to real-time server');
      }
    });

    this.socket.io.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}`);
      this.setConnectionStatus('reconnecting');
    });

    this.socket.io.on('reconnect', () => {
      console.log('Reconnected to WebSocket server');
      this.setConnectionStatus('connected');
      toast.success('Reconnected to real-time server');
    });

    this.socket.io.on('reconnect_failed', () => {
      console.error('Failed to reconnect to WebSocket server');
      this.setConnectionStatus('disconnected');
      toast.error('Failed to reconnect. Please refresh the page.');
    });

    // Data events
    this.socket.on('realtime-update', (data: RealtimeUpdateEvent) => {
      this.emit('realtime-update', data);
    });

    this.socket.on('spc-update', (data: SPCUpdateEvent) => {
      this.emit('spc-update', data);
    });

    this.socket.on('machine-status', (data: MachineStatusEvent) => {
      this.emit('machine-status', data);
    });

    this.socket.on('machine-alert', (data: MachineAlertEvent) => {
      this.emit('machine-alert', data);

      // Show toast for alerts
      if (data.alertType === 'critical') {
        toast.error(`Alert: ${data.message}`, { duration: 10000 });
      } else if (data.alertType === 'warning') {
        toast.warning(`Warning: ${data.message}`, { duration: 5000 });
      } else {
        toast.info(data.message);
      }
    });

    this.socket.on('subscription-confirmed', (data: { deviceId: string }) => {
      console.log(`Subscription confirmed for ${data.deviceId}`);
      this.emit('subscription-confirmed', data);
    });

    this.socket.on('error', (error: { message: string }) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
      toast.error(`Socket error: ${error.message}`);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.setConnectionStatus('disconnected');
      this.subscribedMachines.clear();
    }
  }

  private resubscribeAll() {
    // Resubscribe to all machines after reconnection
    this.subscribedMachines.forEach(deviceId => {
      if (this.socket) {
        this.socket.emit('subscribe-machine', { deviceId });
      }
    });
  }

  subscribeToMachine(deviceId: string) {
    this.subscribedMachines.add(deviceId);
    if (this.socket?.connected) {
      this.socket.emit('subscribe-machine', { deviceId });
    }
  }

  unsubscribeFromMachine(deviceId: string) {
    this.subscribedMachines.delete(deviceId);
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe-machine', { deviceId });
    }
  }

  isSubscribed(deviceId: string): boolean {
    return this.subscribedMachines.has(deviceId);
  }

  getSubscribedMachines(): string[] {
    return Array.from(this.subscribedMachines);
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

  private emit(event: string, data: SocketEventData) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  // Update auth token (call after login)
  updateAuth(token: string | null) {
    if (this.socket) {
      // Disconnect and reconnect with new auth
      this.disconnect();
      if (token) {
        this.connect();
      }
    }
  }
}

export const socketService = new SocketService();
