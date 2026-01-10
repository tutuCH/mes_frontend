/**
 * Singleton DragDropManager instance for @dnd-kit/dom
 *
 * This hook creates and returns a single DragDropManager instance
 * that is shared across the entire application.
 *
 * The manager coordinates:
 * - Sensors (pointer, keyboard)
 * - Plugins (auto-scroller, accessibility)
 * - Modifiers (restrict to window, etc.)
 * - Event monitoring (dragstart, dragend, collision)
 */

import { DragDropManager, PointerSensor } from '@dnd-kit/dom'

let managerInstance: DragDropManager | null = null

export function useDragDropManager(): DragDropManager {
  if (!managerInstance) {
    managerInstance = new DragDropManager({
      sensors: [PointerSensor],
    })
  }
  return managerInstance
}
