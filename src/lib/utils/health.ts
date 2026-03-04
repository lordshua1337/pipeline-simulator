// Pipeline Simulator -- Stage Health Utilities

import type { Item, HealthStatus } from '../types'

/**
 * Determine stage health based on item flow.
 * Green: items moving at normal pace
 * Yellow: items slowing down (>2x avg time)
 * Red: bottleneck (>3x avg time or no movement)
 */
export function getStageHealth(items: readonly Item[]): HealthStatus {
  if (items.length === 0) return 'green'

  const now = Date.now()
  const timeInStage = items.map((item) => {
    const entered = new Date(item.enteredAt).getTime()
    return (now - entered) / 1000
  })

  const avg = timeInStage.reduce((a, b) => a + b, 0) / items.length
  const max = Math.max(...timeInStage)

  if (avg === 0) return 'green'
  if (max > avg * 3) return 'red'
  if (max > avg * 2) return 'yellow'

  return 'green'
}

/**
 * Get bottleneck score for a stage (0-100).
 * Higher = worse bottleneck.
 */
export function getBottleneckScore(items: readonly Item[]): number {
  if (items.length === 0) return 0

  const health = getStageHealth(items)
  if (health === 'red') return 75 + Math.min(25, items.length * 2)
  if (health === 'yellow') return 40 + Math.min(35, items.length)
  return Math.min(30, items.length * 3)
}
