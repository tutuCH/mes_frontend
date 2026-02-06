import { generateUUID } from '@/utils/uuid'

const CHANNEL_NAME = 'mes-alerts-stream'
const LOCK_KEY = 'mes_alerts_leader'
const HEARTBEAT_MS = 5000
const LOCK_TTL_MS = 15000

export type AlertsEventKey = 'system' | 'machine-alert' | 'alarm-update'

type CoordinatorDeps = {
  setAlertsEnabled: (enabled: boolean) => void
  onAlertsEvent: (callback: (eventName: AlertsEventKey, payload: unknown) => void) => () => void
  receiveExternalEvent: (eventName: AlertsEventKey, payload: unknown) => void
}

type LockPayload = {
  tabId: string
  expiresAt: number
}

type BroadcastMessage = {
  type: 'alerts-event'
  eventName: AlertsEventKey
  payload: unknown
  sourceTabId: string
}

export class AlertsStreamCoordinator {
  private tabId = generateUUID()
  private channel: BroadcastChannel | null = null
  private isLeader = false
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private offAlerts: (() => void) | null = null
  private deps: CoordinatorDeps

  constructor(deps: CoordinatorDeps) {
    this.deps = deps
  }

  start() {
    this.channel = new BroadcastChannel(CHANNEL_NAME)
    this.channel.onmessage = (event) => {
      const message = event.data as BroadcastMessage
      if (message.type === 'alerts-event' && message.sourceTabId !== this.tabId) {
        this.deps.receiveExternalEvent(message.eventName, message.payload)
      }
    }

    const lock = this.readLock()
    if (!lock) {
      this.becomeLeader()
      return
    }

    this.deps.setAlertsEnabled(false)
  }

  stop() {
    this.resignLeader()
    this.channel?.close()
    this.channel = null
  }

  notifyUserInteraction() {
    if (this.isLeader) return
    if (!this.canClaimLeadership()) return
    this.becomeLeader()
  }

  private readLock(): LockPayload | null {
    const raw = localStorage.getItem(LOCK_KEY)
    if (!raw) return null

    try {
      return JSON.parse(raw) as LockPayload
    } catch {
      return null
    }
  }

  private canClaimLeadership() {
    const lock = this.readLock()
    if (!lock) return true
    return lock.expiresAt <= Date.now()
  }

  private writeLock() {
    const payload: LockPayload = {
      tabId: this.tabId,
      expiresAt: Date.now() + LOCK_TTL_MS,
    }
    localStorage.setItem(LOCK_KEY, JSON.stringify(payload))
  }

  private becomeLeader() {
    this.isLeader = true
    this.deps.setAlertsEnabled(true)
    this.writeLock()
    this.heartbeatTimer = setInterval(() => this.writeLock(), HEARTBEAT_MS)

    this.offAlerts = this.deps.onAlertsEvent((eventName, payload) => {
      this.channel?.postMessage({
        type: 'alerts-event',
        eventName,
        payload,
        sourceTabId: this.tabId,
      } satisfies BroadcastMessage)
    })
  }

  private resignLeader() {
    if (!this.isLeader) return
    this.isLeader = false
    this.offAlerts?.()
    this.offAlerts = null
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    const lock = this.readLock()
    if (lock?.tabId === this.tabId) {
      localStorage.removeItem(LOCK_KEY)
    }
  }
}
