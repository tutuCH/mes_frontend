import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import type { RealtimeUpdateEvent, SPCUpdateEvent, MachineAlertEvent, MachineStatusEvent, AlarmUpdateEvent, SpcSeriesUpdateEvent } from '@/types/api';
import { t } from '@/utils/i18n';
import { createLogger } from '@/utils/logger';

const logger = createLogger('WebSocket');
const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

// Task 6: Gate debug logging to reduce console retention overhead
const DEBUG_WS = import.meta.env.VITE_DEBUG_WS === 'true';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

type SocketEventMap = {
  'realtime-update': RealtimeUpdateEvent;
  'spc-update': SPCUpdateEvent;
  'spc-series-update': SpcSeriesUpdateEvent;
  'machine-alert': MachineAlertEvent;
  'machine-status': MachineStatusEvent;
  'alarm-update': AlarmUpdateEvent;
  'subscription-confirmed': { deviceId: string };
  'error': { message: string };
};

type SocketEventKey = keyof SocketEventMap;
type EventCallback = (data: any) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, EventCallback[]> = new Map();
  private subscribedMachines: Set<string> = new Set();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private isConnecting: boolean = false;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

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
    // Prevent multiple simultaneous connections
    if (this.socket?.connected || this.isConnecting) {
      logger.debug('Connection already in progress or established');
      return;
    }

    this.isConnecting = true;
    this.setConnectionStatus('connecting');

    // Get auth token for WebSocket authentication
    const token = localStorage.getItem('auth_token');
    logger.debug('Connecting to', SOCKET_URL, 'with auth:', !!token);

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,  // Manual connect after setting up handlers
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Set up ALL event handlers BEFORE connecting
    this.socket.on('connect', () => {
      logger.info('Connected to WebSocket server');
      this.isConnecting = false;
      this.setConnectionStatus('connected');
      this.reconnectAttempts = 0;

      // Send ping immediately to keep connection alive
      this.socket?.emit('ping');
      logger.debug('Initial ping sent');

      // Start keep-alive interval
      this.startKeepAlive();

      // Resubscribe to all machines on reconnection
      const machinesToResubscribe = this.getSubscribedMachines();
      logger.debug('Resubscribing to', machinesToResubscribe.length, 'machines:', machinesToResubscribe);
      this.resubscribeAll();

      toast.success(t('websocket.connected'), { duration: 1000 });
    });

    this.socket.on('disconnect', (reason) => {
      logger.debug('Disconnected from WebSocket server:', reason);
      this.setConnectionStatus('disconnected');
      this.isConnecting = false;
      this.stopKeepAlive(); // Stop keep-alive on disconnect

      if (reason === 'io server disconnect') {
        // Server disconnected, might need to reauthenticate
        toast.error(t('websocket.disconnectedByServer'), { duration: 1000 });
      } else if (reason !== 'io client disconnect') {
        toast.warning(t('websocket.connectionLost'), { duration: 1000 });
      }
    });

    this.socket.on('connect_error', (error) => {
      logger.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error(t('websocket.connectFailed'), { duration: 1000 });
      }
    });

    this.socket.io.on('reconnect_attempt', (attemptNumber) => {
      logger.debug(`Reconnection attempt ${attemptNumber}`);
      this.setConnectionStatus('reconnecting');
    });

    this.socket.io.on('reconnect', () => {
      logger.info('Reconnected to WebSocket server');
      this.setConnectionStatus('connected');
      toast.success(t('websocket.reconnected'), { duration: 1000 });
    });

    this.socket.io.on('reconnect_failed', () => {
      logger.error('Failed to reconnect to WebSocket server');
      this.setConnectionStatus('disconnected');
      toast.error(t('websocket.reconnectFailed'), { duration: 1000 });
    });

    // Data events
    this.socket.on('realtime-update', (data: RealtimeUpdateEvent) => {
      // Task 6: Gate per-message logging
      if (DEBUG_WS) {
        const payloadData = data.Data ?? data.data;
        logger.debug('realtime-update received:', {
          deviceId: data.deviceId,
          timestamp: data.timestamp,
          dataKeys: payloadData && typeof payloadData === 'object' ? Object.keys(payloadData) : [],
          hasData: !!payloadData
        });
      }
      this.emit('realtime-update', data);
    });

    this.socket.on('spc-update', (data: SPCUpdateEvent) => {
      // Task 6: Gate per-message logging
      if (DEBUG_WS) {
        const payloadData = data.Data ?? data.data;
        logger.debug('spc-update received:', {
          deviceId: data.deviceId,
          timestamp: data.timestamp,
          dataKeys: payloadData && typeof payloadData === 'object' ? Object.keys(payloadData) : [],
          hasData: !!payloadData
        });
      }
      this.emit('spc-update', data);
    });

    this.socket.on('machine-status', (data: MachineStatusEvent) => {
      if (DEBUG_WS) {
        logger.debug('machine-status received:', {
          deviceId: data.deviceId,
          status: data.status,
          source: data.source
        });
      }
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

    this.socket.on('alarm-update', (data: AlarmUpdateEvent) => {
      this.emit('alarm-update', data);

      // Show toast for alarms
      if (data.alarm.message) {
        toast.error(`Alarm: ${data.alarm.message}`, { duration: 8000 });
      }
    });

    this.socket.on('subscription-confirmed', (data: { deviceId: string }) => {
      logger.debug('Subscription confirmed for', data.deviceId, '(Total subscribed:', this.getSubscribedMachines().length, ')');
      this.emit('subscription-confirmed', data);
    });

    this.socket.on('error', (error: { message: string }) => {
      logger.error('WebSocket error:', error);
      this.emit('error', error);
      toast.error(`${t('websocket.socketError')}: ${error.message}`);
    });

    // NOW connect manually after all handlers are set up
    this.socket.connect();
  }

  disconnect() {
    this.stopKeepAlive();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.setConnectionStatus('disconnected');
      this.subscribedMachines.clear();
      this.isConnecting = false;
    }
  }

  private startKeepAlive() {
    this.stopKeepAlive(); // Clear any existing

    this.keepAliveInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
        if (DEBUG_WS) logger.debug('Keep-alive ping sent');
      }
    }, 30000); // Every 30 seconds
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
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
      logger.debug('Subscribing to machine:', deviceId);
      this.socket.emit('subscribe-machine', { deviceId });
    } else {
      logger.debug('Cannot subscribe to', deviceId, '- socket not connected');
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

  on<K extends SocketEventKey>(event: K, callback: (data: SocketEventMap[K]) => void): void;
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off<K extends SocketEventKey>(event: K, callback: (data: SocketEventMap[K]) => void): void;
  off(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event)?.filter(cb => cb !== callback);
    this.listeners.set(event, callbacks || []);
  }

  private emit<K extends SocketEventKey>(event: K, data: SocketEventMap[K]): void;
  private emit(event: string, data: unknown): void {
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
