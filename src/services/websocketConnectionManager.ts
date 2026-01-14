/**
 * WebSocket Connection Manager
 * Ensures only one WebSocket connection exists and manages subscription deduplication
 */

import { socketService } from './socket'
import { createLogger } from '@/utils/logger'

const logger = createLogger('WSConnectionManager')

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

type EventCallback = (data: unknown) => void

interface Subscription {
  event: string
  callback: EventCallback
  subscriberId: string
  component: string
}

class WebSocketConnectionManager {
  private static instance: WebSocketConnectionManager | null = null
  private connectionPromise: Promise<void> | null = null
  private subscriptions: Map<string, Set<Subscription>> = new Map()
  private subscriberIdCounter = 0
  private connectionStatus: ConnectionStatus = 'disconnected'

  private constructor() {
    this.setupStatusTracking()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WebSocketConnectionManager {
    if (!WebSocketConnectionManager.instance) {
      WebSocketConnectionManager.instance = new WebSocketConnectionManager()
    }
    return WebSocketConnectionManager.instance
  }

  /**
   * Track connection status changes
   */
  private setupStatusTracking() {
    socketService.onStatusChange((status) => {
      this.connectionStatus = status
      logger.debug('Connection status changed:', status)
    })
  }

  /**
   * Connect to WebSocket (ensures only one connection)
   */
  async connect(): Promise<void> {
    // If already connected, return immediately
    if (socketService.getConnectionStatus() === 'connected') {
      logger.debug('Already connected, skipping connection')
      return Promise.resolve()
    }

    // If connection is in progress, return the existing promise
    if (this.connectionPromise) {
      logger.debug('Connection already in progress, waiting for existing connection')
      return this.connectionPromise
    }

    // Create new connection promise
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        socketService.connect()

        // Wait for connection to be established
        const unsubscribe = socketService.onStatusChange((status) => {
          if (status === 'connected') {
            logger.debug('Connection established successfully')
            unsubscribe()
            this.connectionPromise = null
            resolve()
          } else if (status === 'disconnected') {
            unsubscribe()
            this.connectionPromise = null
            // Don't reject - the connection might reconnect
          }
        })

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.connectionPromise) {
            unsubscribe()
            this.connectionPromise = null
            reject(new Error('Connection timeout'))
          }
        }, 10000)
      } catch (error) {
        this.connectionPromise = null
        reject(error)
      }
    })

    return this.connectionPromise
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    logger.debug('Disconnecting WebSocket')
    this.subscriptions.clear()
    socketService.disconnect()
    this.connectionPromise = null
  }

  /**
   * Subscribe to an event with deduplication
   * @param event - Event name to subscribe to
   * @param callback - Callback function for the event
   * @param componentName - Name of the component subscribing (for debugging)
   * @returns Unsubscribe function
   */
  subscribe(event: string, callback: EventCallback, componentName = 'Unknown'): () => void {
    const subscriberId = `${componentName}-${this.subscriberIdCounter++}`

    logger.debug('Subscribing to event:', event, 'for component:', componentName, 'id:', subscriberId)

    // Check if this exact callback is already subscribed by this component
    const eventSubscriptions = this.subscriptions.get(event) || new Set()
    const existingSubscription = Array.from(eventSubscriptions).find(
      (sub) => sub.component === componentName && sub.callback === callback
    )

    if (existingSubscription) {
      logger.debug('Callback already subscribed for this component, returning existing unsubscribe')
      return () => this.unsubscribe(event, existingSubscription.subscriberId)
    }

    // Create new subscription
    const subscription: Subscription = {
      event,
      callback,
      subscriberId,
      component: componentName,
    }

    // Add to subscriptions map
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set())
    }
    this.subscriptions.get(event)!.add(subscription)

    // Subscribe to socket service
    socketService.on(event, callback)

    // Return unsubscribe function
    return () => this.unsubscribe(event, subscriberId)
  }

  /**
   * Unsubscribe from an event
   * @param event - Event name to unsubscribe from
   * @param subscriberId - ID of the subscriber to remove
   */
  private unsubscribe(event: string, subscriberId: string): void {
    const eventSubscriptions = this.subscriptions.get(event)
    if (!eventSubscriptions) return

    const subscription = Array.from(eventSubscriptions).find((sub) => sub.subscriberId === subscriberId)
    if (!subscription) return

    logger.debug('Unsubscribing from event:', event, 'for component:', subscription.component, 'id:', subscriberId)

    // Remove from socket service
    socketService.off(event, subscription.callback)

    // Remove from subscriptions map
    eventSubscriptions.delete(subscription)

    // Clean up empty event subscriptions
    if (eventSubscriptions.size === 0) {
      this.subscriptions.delete(event)
    }
  }

  /**
   * Unsubscribe all subscriptions for a component
   * @param componentName - Name of the component to unsubscribe
   */
  unsubscribeComponent(componentName: string): void {
    logger.debug('Unsubscribing all events for component:', componentName)

    for (const [event, subscriptions] of this.subscriptions.entries()) {
      for (const subscription of subscriptions) {
        if (subscription.component === componentName) {
          this.unsubscribe(event, subscription.subscriberId)
        }
      }
    }
  }

  /**
   * Get all subscriptions
   */
  getSubscriptions(): Map<string, Set<Subscription>> {
    return new Map(this.subscriptions)
  }

  /**
   * Get subscription count for an event
   */
  getSubscriptionCount(event: string): number {
    return this.subscriptions.get(event)?.size || 0
  }

  /**
   * Get total subscription count
   */
  getTotalSubscriptionCount(): number {
    let count = 0
    for (const subscriptions of this.subscriptions.values()) {
      count += subscriptions.size
    }
    return count
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return socketService.getConnectionStatus() === 'connected'
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  /**
   * Subscribe to machine (alias to socketService)
   */
  subscribeToMachine(deviceId: string): void {
    socketService.subscribeToMachine(deviceId)
  }

  /**
   * Unsubscribe from machine (alias to socketService)
   */
  unsubscribeFromMachine(deviceId: string): void {
    socketService.unsubscribeFromMachine(deviceId)
  }

  /**
   * Check if subscribed to machine (alias to socketService)
   */
  isSubscribed(deviceId: string): boolean {
    return socketService.isSubscribed(deviceId)
  }

  /**
   * Get subscribed machines (alias to socketService)
   */
  getSubscribedMachines(): string[] {
    return socketService.getSubscribedMachines()
  }

  /**
   * Update auth token (alias to socketService)
   */
  updateAuth(token: string | null): void {
    socketService.updateAuth(token)
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    logger.debug('Cleaning up all subscriptions')
    this.subscriptions.clear()
    this.subscriberIdCounter = 0
  }
}

// Export singleton instance
export const wsConnectionManager = WebSocketConnectionManager.getInstance()

// Export class for testing
export { WebSocketConnectionManager }
