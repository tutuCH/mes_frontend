import { toast } from 'sonner';
import type {
  RealtimeUpdateEvent,
  SPCUpdateEvent,
  SpcSeriesUpdateEvent,
  MachineAlertEvent,
  MachineStatusEvent,
  AlarmUpdateEvent,
} from '@/types/api';
import { api } from '@/services/api';
import { t } from '@/utils/i18n';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SSE');
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const DEBUG_SSE = import.meta.env.VITE_DEBUG_SSE === 'true';
const MAX_DEVICES_PER_STREAM = 10;
const DEFAULT_TICKET_TTL_SECONDS = 300;
const TICKET_REFRESH_BUFFER_SECONDS = 30;
const MIN_TICKET_REFRESH_SECONDS = 5;
const DEVICE_LIMIT_TOAST_COOLDOWN_MS = 8000;

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

type StreamPurpose = 'data' | 'alerts';

type SystemEvent = {
  kind?: string;
  ts?: string;
  [key: string]: unknown;
};

type SSEEventMap = {
  system: SystemEvent;
  'realtime-update': RealtimeUpdateEvent;
  'spc-update': SPCUpdateEvent;
  'spc-series-update': SpcSeriesUpdateEvent;
  'machine-alert': MachineAlertEvent;
  'machine-status': MachineStatusEvent;
  'alarm-update': AlarmUpdateEvent;
  'subscription-confirmed': { deviceId: string };
  'error': { message: string };
};

type SSEEventKey = keyof SSEEventMap;
type EventCallback = (data: any) => void;

type StreamState = {
  source: EventSource | null;
  url: string | null;
  retryCount: number;
  reconnectTimeout: ReturnType<typeof setTimeout> | null;
  refreshTimeout: ReturnType<typeof setTimeout> | null;
  ticketRefreshTimeout: ReturnType<typeof setTimeout> | null;
  lastProbeAt: number | null;
  deviceKey: string | null;
  lastStatusCode: number | null;
};

const createStreamState = (): StreamState => ({
  source: null,
  url: null,
  retryCount: 0,
  reconnectTimeout: null,
  refreshTimeout: null,
  ticketRefreshTimeout: null,
  lastProbeAt: null,
  deviceKey: null,
  lastStatusCode: null,
});

class SSEService {
  private dataStream: StreamState = createStreamState();
  private alertsStream: StreamState = createStreamState();
  private listeners: Map<string, EventCallback[]> = new Map();
  private subscribedMachines: Set<string> = new Set();
  private deviceRefCounts: Map<string, number> = new Map();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private maxReconnectAttempts = 10;
  private isEnabled = false;
  private lastDeviceLimitToastAt: number | null = null;

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  connect() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.openAlertsStream();
    this.openDataStream();
  }

  disconnect() {
    this.isEnabled = false;
    this.subscribedMachines.clear();
    this.deviceRefCounts.clear();
    this.clearDataRefresh();
    this.closeAlertsStream();
    this.closeDataStream();
    this.setConnectionStatus('disconnected');
  }

  subscribeToMachine(deviceId: string): () => void {
    if (!deviceId) return () => undefined;

    const currentCount = this.deviceRefCounts.get(deviceId) ?? 0;
    if (currentCount === 0 && this.subscribedMachines.size >= MAX_DEVICES_PER_STREAM) {
      this.notifyDeviceLimitReached();
      logger.warn('SSE device limit reached', {
        deviceId,
        limit: MAX_DEVICES_PER_STREAM,
      });
      return () => undefined;
    }

    const nextCount = currentCount + 1;
    this.deviceRefCounts.set(deviceId, nextCount);
    if (DEBUG_SSE) {
      logger.debug('SSE subscribe', {
        deviceId,
        refCount: nextCount,
        uniqueDevices: this.subscribedMachines.size + (currentCount === 0 ? 1 : 0),
      });
    }

    if (currentCount === 0) {
      this.subscribedMachines.add(deviceId);
      if (!this.isEnabled) {
        this.connect();
      } else {
        this.scheduleDataRefresh();
      }
    }

    return () => this.unsubscribeFromMachine(deviceId);
  }

  unsubscribeFromMachine(deviceId: string) {
    const currentCount = this.deviceRefCounts.get(deviceId);
    if (!currentCount) return;

    const nextCount = currentCount - 1;
    if (nextCount > 0) {
      this.deviceRefCounts.set(deviceId, nextCount);
      if (DEBUG_SSE) {
        logger.debug('SSE unsubscribe', {
          deviceId,
          refCount: nextCount,
          uniqueDevices: this.subscribedMachines.size,
        });
      }
      return;
    }

    this.deviceRefCounts.delete(deviceId);
    this.subscribedMachines.delete(deviceId);
    if (DEBUG_SSE) {
      logger.debug('SSE unsubscribe', {
        deviceId,
        refCount: 0,
        uniqueDevices: this.subscribedMachines.size,
      });
    }
    if (this.subscribedMachines.size === 0) {
      this.clearDataRefresh();
      this.closeDataStream();
      this.setConnectionStatus('disconnected');
      return;
    }
    this.scheduleDataRefresh();
  }

  isSubscribed(deviceId: string): boolean {
    return this.subscribedMachines.has(deviceId);
  }

  getSubscribedMachines(): string[] {
    return Array.from(this.subscribedMachines);
  }

  on<K extends SSEEventKey>(event: K, callback: (data: SSEEventMap[K]) => void): void;
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off<K extends SSEEventKey>(event: K, callback: (data: SSEEventMap[K]) => void): void;
  off(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event)?.filter((cb) => cb !== callback);
    this.listeners.set(event, callbacks || []);
  }

  updateAuth(token: string | null) {
    if (!token) {
      this.disconnect();
      return;
    }
    if (this.isEnabled) {
      this.closeAlertsStream();
      this.closeDataStream();
      this.openAlertsStream();
      this.openDataStream();
    }
  }

  private emit<K extends SSEEventKey>(event: K, data: SSEEventMap[K]): void;
  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  private notifyDeviceLimitReached() {
    const now = Date.now();
    if (this.lastDeviceLimitToastAt && now - this.lastDeviceLimitToastAt < DEVICE_LIMIT_TOAST_COOLDOWN_MS) {
      return;
    }
    this.lastDeviceLimitToastAt = now;
    toast.error(t('websocket.deviceLimitReached', { limit: MAX_DEVICES_PER_STREAM }));
  }

  private getDeviceIds(): string[] {
    return Array.from(this.subscribedMachines).sort();
  }

  private getDeviceKey(deviceIds: string[]): string {
    return deviceIds.join('|');
  }

  private scheduleDataRefresh() {
    if (!this.isEnabled) return;
    if (this.dataStream.refreshTimeout) return;
    this.dataStream.refreshTimeout = setTimeout(() => {
      this.dataStream.refreshTimeout = null;
      this.openDataStream();
    }, 100);
  }

  private clearDataRefresh() {
    if (this.dataStream.refreshTimeout) {
      clearTimeout(this.dataStream.refreshTimeout);
      this.dataStream.refreshTimeout = null;
    }
  }

  private async openDataStream(options: { force?: boolean; silent?: boolean; reopenDelayMs?: number } = {}) {
    if (!this.isEnabled) return;

    const deviceIds = this.getDeviceIds();
    if (deviceIds.length === 0) {
      this.closeDataStream();
      this.setConnectionStatus('disconnected');
      return;
    }

    const deviceKey = this.getDeviceKey(deviceIds);
    if (options.force) {
      this.closeDataStream();
      if (options.reopenDelayMs && options.reopenDelayMs > 0) {
        setTimeout(() => {
          if (!this.isEnabled) return;
          this.openDataStream({ silent: options.silent });
        }, options.reopenDelayMs);
        return;
      }
    } else {
      if (this.dataStream.source && this.dataStream.deviceKey === deviceKey) {
        if (this.connectionStatus === 'connecting' || this.connectionStatus === 'connected') return;
      }

      if (this.dataStream.source && this.dataStream.deviceKey !== deviceKey) {
        this.closeDataStream();
      }
    }

    const nextStatus = this.connectionStatus === 'reconnecting' ? 'reconnecting' : 'connecting';
    this.setConnectionStatus(nextStatus, { silent: options.silent });

    try {
      const { ticket, expiresInSeconds } = await this.requestStreamTicket('data');
      if (!this.isEnabled) return;

      const latestDeviceKey = this.getDeviceKey(this.getDeviceIds());
      if (latestDeviceKey !== deviceKey) {
        this.scheduleDataRefresh();
        return;
      }

      const url = this.buildDataStreamUrl(deviceIds, ticket);
      logger.info('Opening data SSE stream', {
        deviceCount: deviceIds.length,
        deviceIds,
        url,
      });

      const source = new EventSource(url, { withCredentials: true });
      this.dataStream.source = source;
      this.dataStream.deviceKey = deviceKey;
      this.dataStream.url = url;
      this.dataStream.lastProbeAt = null;

      source.onopen = () => {
        this.dataStream.retryCount = 0;
        this.dataStream.lastProbeAt = null;
        this.dataStream.lastStatusCode = null;
        this.setConnectionStatus('connected', { silent: options.silent });
        this.scheduleTicketRefresh(this.dataStream, 'data', expiresInSeconds);
      };

      source.onerror = () => {
        logger.warn('Data SSE stream error', {
          deviceCount: deviceIds.length,
          url,
          readyState: source.readyState,
        });
        this.maybeProbeStreamStatus(this.dataStream, url);
        this.handleStreamError(this.dataStream, 'data');
      };

      this.attachStreamListeners(source, 'data');
    } catch (error) {
      logger.error('Failed to open data SSE stream', {
        deviceCount: deviceIds.length,
        message: error instanceof Error ? error.message : String(error),
      });
      this.scheduleReconnect(this.dataStream, 'data');
    }
  }

  private async openAlertsStream(options: { force?: boolean; silent?: boolean; reopenDelayMs?: number } = {}) {
    if (!this.isEnabled) return;

    if (options.force) {
      this.closeAlertsStream();
      if (options.reopenDelayMs && options.reopenDelayMs > 0) {
        setTimeout(() => {
          if (!this.isEnabled) return;
          this.openAlertsStream({ silent: options.silent });
        }, options.reopenDelayMs);
        return;
      }
    } else if (this.alertsStream.source) {
      if (this.alertsStream.source.readyState !== EventSource.CLOSED) return;
      this.closeAlertsStream();
    }

    try {
      const { ticket, expiresInSeconds } = await this.requestStreamTicket('alerts');
      if (!this.isEnabled) return;

      const url = this.buildAlertsStreamUrl(ticket);
      logger.info('Opening alerts SSE stream', { url });

      const source = new EventSource(url, { withCredentials: true });
      this.alertsStream.source = source;
      this.alertsStream.url = url;
      this.alertsStream.lastProbeAt = null;

      source.onopen = () => {
        this.alertsStream.retryCount = 0;
        this.alertsStream.lastProbeAt = null;
        this.alertsStream.lastStatusCode = null;
        this.scheduleTicketRefresh(this.alertsStream, 'alerts', expiresInSeconds);
      };

      source.onerror = () => {
        logger.warn('Alerts SSE stream error', {
          url,
          readyState: source.readyState,
        });
        this.maybeProbeStreamStatus(this.alertsStream, url);
        this.handleStreamError(this.alertsStream, 'alerts');
      };

      this.attachStreamListeners(source, 'alerts');
    } catch (error) {
      logger.error('Failed to open alerts SSE stream', {
        message: error instanceof Error ? error.message : String(error),
      });
      this.scheduleReconnect(this.alertsStream, 'alerts');
    }
  }

  private closeDataStream() {
    this.closeStream(this.dataStream);
  }

  private closeAlertsStream() {
    this.closeStream(this.alertsStream);
  }

  private closeStream(stream: StreamState) {
    if (stream.reconnectTimeout) {
      clearTimeout(stream.reconnectTimeout);
      stream.reconnectTimeout = null;
    }

    if (stream.refreshTimeout) {
      clearTimeout(stream.refreshTimeout);
      stream.refreshTimeout = null;
    }

    if (stream.ticketRefreshTimeout) {
      clearTimeout(stream.ticketRefreshTimeout);
      stream.ticketRefreshTimeout = null;
    }

    if (stream.source && DEBUG_SSE) {
      logger.debug('Closing SSE stream', { url: stream.url });
    }
    stream.source?.close();
    stream.source = null;
    stream.url = null;
    stream.retryCount = 0;
    stream.lastProbeAt = null;
    stream.deviceKey = null;
    stream.lastStatusCode = null;
  }

  private attachStreamListeners(source: EventSource, purpose: StreamPurpose) {
    const events: SSEEventKey[] = purpose === 'alerts'
      ? ['system', 'machine-alert', 'alarm-update']
      : [
          'system',
          'realtime-update',
          'spc-update',
          'spc-series-update',
          'machine-status',
          'subscription-confirmed',
        ];

    events.forEach((eventName) => {
      source.addEventListener(eventName, (event) => {
        this.handleEvent(eventName, event as MessageEvent);
      });
    });
  }

  private handleEvent(eventName: SSEEventKey, event: MessageEvent) {
    if (!event.data) return;

    try {
      const payload = JSON.parse(event.data);
      this.emit(eventName, payload as SSEEventMap[SSEEventKey]);

      if (eventName === 'machine-alert') {
        this.handleMachineAlert(payload as MachineAlertEvent);
      }

      if (eventName === 'alarm-update') {
        this.handleAlarmUpdate(payload as AlarmUpdateEvent);
      }
    } catch (error) {
      logger.error('Failed to parse SSE event', { eventName, error });
    }
  }

  private handleStreamError(stream: StreamState, purpose: StreamPurpose) {
    if (!stream.source) return;

    stream.source.close();
    stream.source = null;
    if (purpose === 'data') {
      this.setConnectionStatus('reconnecting');
    }
    this.scheduleReconnect(stream, purpose);
  }

  private maybeProbeStreamStatus(stream: StreamState, url: string) {
    const now = Date.now();
    if (stream.lastProbeAt && now - stream.lastProbeAt < 5000) return;
    stream.lastProbeAt = now;
    void this.probeStreamStatus(url, stream);
  }

  private async probeStreamStatus(url: string, stream: StreamState) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
        },
        credentials: 'include',
        signal: controller.signal,
      });

      logger.warn('SSE stream probe status', {
        status: response.status,
        statusText: response.statusText,
      });
      stream.lastStatusCode = response.status;
    } catch (error) {
      logger.warn('SSE stream probe failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  }

  private scheduleReconnect(stream: StreamState, purpose: StreamPurpose) {
    if (!this.isEnabled) return;
    if (purpose === 'data' && this.subscribedMachines.size === 0) return;
    if (stream.reconnectTimeout) return;

    stream.retryCount += 1;

    if (stream.retryCount > this.maxReconnectAttempts) {
      if (purpose === 'data') {
        this.setConnectionStatus('disconnected');
        this.emit('error', { message: t('websocket.connectFailed') });
        toast.error(t('websocket.connectFailed'), { duration: 1000 });
      }
      return;
    }

    let delay = Math.min(10000, 1000 * 2 ** stream.retryCount);
    if (stream.lastStatusCode === 429) {
      delay = Math.max(delay, 5000);
    }
    stream.reconnectTimeout = setTimeout(() => {
      stream.reconnectTimeout = null;
      if (purpose === 'data') {
        this.openDataStream({ silent: true });
      } else {
        this.openAlertsStream({ silent: true });
      }
    }, delay);
  }

  private scheduleTicketRefresh(stream: StreamState, purpose: StreamPurpose, expiresInSeconds?: number) {
    if (!this.isEnabled) return;
    if (stream.ticketRefreshTimeout) {
      clearTimeout(stream.ticketRefreshTimeout);
      stream.ticketRefreshTimeout = null;
    }

    const ttlSeconds = expiresInSeconds ?? DEFAULT_TICKET_TTL_SECONDS;
    const refreshAfterSeconds = Math.max(
      MIN_TICKET_REFRESH_SECONDS,
      ttlSeconds - TICKET_REFRESH_BUFFER_SECONDS
    );

    stream.ticketRefreshTimeout = setTimeout(() => {
      stream.ticketRefreshTimeout = null;
      if (!this.isEnabled) return;
      if (purpose === 'data') {
        this.openDataStream({ force: true, silent: true, reopenDelayMs: 250 });
      } else {
        this.openAlertsStream({ force: true, silent: true, reopenDelayMs: 250 });
      }
    }, refreshAfterSeconds * 1000);
  }

  private setConnectionStatus(status: ConnectionStatus, options: { silent?: boolean } = {}) {
    if (this.connectionStatus === status) return;
    this.connectionStatus = status;
    this.statusListeners.forEach((callback) => callback(status));

    if (options.silent) return;

    if (status === 'connected') {
      toast.success(t('websocket.connected'), { duration: 1000 });
    }

    if (status === 'reconnecting') {
      toast.warning(t('websocket.connectionLost'), { duration: 1000 });
    }

    if (status === 'disconnected' && this.subscribedMachines.size > 0) {
      toast.error(t('websocket.disconnected'), { duration: 1000 });
    }
  }

  private buildDataStreamUrl(deviceIds: string[], ticket: string) {
    const params = new URLSearchParams();
    if (deviceIds.length === 1) {
      params.set('deviceId', deviceIds[0]);
    } else {
      params.set('deviceIds', deviceIds.join(','));
    }
    params.set('ticket', ticket);
    return `${BASE_URL}/sse/stream?${params.toString()}`;
  }

  private buildAlertsStreamUrl(ticket: string) {
    const params = new URLSearchParams();
    params.set('ticket', ticket);
    return `${BASE_URL}/sse/alerts?${params.toString()}`;
  }

  private async requestStreamTicket(
    purpose: StreamPurpose,
    ttlSeconds = DEFAULT_TICKET_TTL_SECONDS
  ): Promise<{ ticket: string; expiresInSeconds?: number }> {
    const token = api.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    logger.debug('Requesting SSE ticket', {
      ttlSeconds,
      purpose,
      hasToken: Boolean(token),
      baseUrl: BASE_URL,
    });

    const response = await fetch(`${BASE_URL}/sse/stream-ticket`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ ttlSeconds, purpose }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Stream ticket request failed', {
        status: response.status,
        statusText: response.statusText,
        body: errorText || 'Empty response',
      });
      throw new Error(`Stream ticket request failed (${response.status})`);
    }

    const payload = await response.json();
    logger.debug('Stream ticket received', {
      expiresInSeconds: payload?.expiresInSeconds,
      hasTicket: Boolean(payload?.ticket),
      purpose,
    });
    return payload;
  }

  private handleMachineAlert(payload: MachineAlertEvent) {
    if (payload.alertType === 'critical') {
      toast.error(`Alert: ${payload.message}`, { duration: 10000 });
    } else if (payload.alertType === 'warning') {
      toast.warning(`Warning: ${payload.message}`, { duration: 5000 });
    } else {
      toast.info(payload.message);
    }
  }

  private handleAlarmUpdate(payload: AlarmUpdateEvent) {
    if (payload.alarm.message) {
      toast.error(`Alarm: ${payload.alarm.message}`, { duration: 8000 });
    }
  }
}

export const sseService = new SSEService();
