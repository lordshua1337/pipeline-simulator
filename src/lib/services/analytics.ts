// Pipeline Simulator -- Analytics Service

import type { Stage, Item, StageHistory, AnalyticsMetrics } from '../types'

/**
 * Calculate velocity (items per day moving through a stage).
 */
export function computeVelocity(
  stageId: string,
  history: readonly StageHistory[],
  days: number = 7
): number {
  const cutoff = Date.now() - days * 24 * 3600 * 1000
  const moves = history.filter(
    (h) =>
      h.toStageId === stageId && new Date(h.movedAt).getTime() > cutoff
  )
  return moves.length / days
}

/**
 * Calculate cycle time (average seconds from first to last stage).
 */
export function computeCycleTime(
  items: readonly Item[],
  history: readonly StageHistory[]
): number {
  // Group history by item
  const byItem = new Map<string, StageHistory[]>()
  for (const h of history) {
    const existing = byItem.get(h.itemId) ?? []
    byItem.set(h.itemId, [...existing, h])
  }

  const cycleTimes: number[] = []
  for (const [, itemHistory] of byItem) {
    if (itemHistory.length < 2) continue
    const sorted = [...itemHistory].sort(
      (a, b) => new Date(a.movedAt).getTime() - new Date(b.movedAt).getTime()
    )
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const diff =
      (new Date(last.movedAt).getTime() - new Date(first.movedAt).getTime()) /
      1000
    if (diff > 0) cycleTimes.push(diff)
  }

  if (cycleTimes.length === 0) return 0
  return cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
}

/**
 * Calculate throughput trend (items per week completing the pipeline).
 */
export function computeThroughputTrend(
  history: readonly StageHistory[],
  weeks: number = 4
): readonly { readonly week: number; readonly throughput: number }[] {
  const now = Date.now()
  const trend: { week: number; throughput: number }[] = []

  for (let w = weeks; w >= 0; w--) {
    const weekStart = now - w * 7 * 24 * 3600 * 1000
    const weekEnd = weekStart + 7 * 24 * 3600 * 1000

    const moves = history.filter((h) => {
      const t = new Date(h.movedAt).getTime()
      return t >= weekStart && t < weekEnd
    })

    trend.push({ week: weeks - w + 1, throughput: moves.length })
  }

  return trend
}

/**
 * Calculate conversion rate between two stages.
 */
export function computeConversionRate(
  fromStageId: string,
  toStageId: string,
  history: readonly StageHistory[]
): number {
  const entered = history.filter((h) => h.toStageId === fromStageId).length
  const advanced = history.filter(
    (h) => h.fromStageId === fromStageId && h.toStageId === toStageId
  ).length

  if (entered === 0) return 0
  return advanced / entered
}

/**
 * Get full analytics metrics for a pipeline.
 */
export function computeMetrics(
  stages: readonly Stage[],
  items: readonly Item[],
  history: readonly StageHistory[]
): AnalyticsMetrics {
  // Average velocity across stages
  const velocities = stages.map((s) => computeVelocity(s.id, history))
  const avgVelocity =
    velocities.length > 0
      ? velocities.reduce((a, b) => a + b, 0) / velocities.length
      : 0

  const cycleTime = computeCycleTime(items, history)

  // Weekly throughput (last week)
  const trend = computeThroughputTrend(history, 1)
  const throughput = trend.length > 0 ? trend[trend.length - 1].throughput : 0

  // Average conversion rate
  const conversionRates: number[] = []
  for (let i = 0; i < stages.length - 1; i++) {
    conversionRates.push(
      computeConversionRate(stages[i].id, stages[i + 1].id, history)
    )
  }
  const avgConversion =
    conversionRates.length > 0
      ? conversionRates.reduce((a, b) => a + b, 0) / conversionRates.length
      : 0

  // Bottleneck score (worst stage)
  const bottleneckScores = stages.map((stage) => {
    const stageItems = items.filter((i) => i.stageId === stage.id)
    if (stageItems.length === 0) return 0
    const avgTime =
      stageItems.reduce((sum, item) => {
        return sum + (Date.now() - new Date(item.enteredAt).getTime()) / 1000
      }, 0) / stageItems.length
    return Math.min(100, Math.round(avgTime / (24 * 3600) * 10))
  })
  const maxBottleneck = Math.max(...bottleneckScores, 0)

  return {
    velocity: Math.round(avgVelocity * 100) / 100,
    cycleTime: Math.round(cycleTime),
    throughput,
    conversionRate: Math.round(avgConversion * 100) / 100,
    bottleneckScore: maxBottleneck,
  }
}

/**
 * Detect anomalies (items stuck too long in a stage).
 */
export function detectAnomalies(
  stages: readonly Stage[],
  items: readonly Item[],
  pipelineCreatedAt: string
): {
  readonly isActive: boolean
  readonly message: string
  readonly anomalies: readonly {
    readonly itemId: string
    readonly itemTitle: string
    readonly stageName: string
    readonly daysStuck: number
  }[]
} {
  const pipelineAge =
    (Date.now() - new Date(pipelineCreatedAt).getTime()) / (24 * 3600 * 1000)

  if (pipelineAge < 7) {
    return {
      isActive: false,
      message: 'Anomaly detection activates after 7 days of data.',
      anomalies: [],
    }
  }

  const stageMap = new Map(stages.map((s) => [s.id, s]))
  const anomalies: {
    itemId: string
    itemTitle: string
    stageName: string
    daysStuck: number
  }[] = []

  for (const item of items) {
    const stage = stageMap.get(item.stageId)
    if (!stage) continue

    const daysInStage =
      (Date.now() - new Date(item.enteredAt).getTime()) / (24 * 3600 * 1000)
    const threshold = stage.slaWarningHours / 24

    if (daysInStage > threshold) {
      anomalies.push({
        itemId: item.id,
        itemTitle: item.title,
        stageName: stage.name,
        daysStuck: Math.round(daysInStage * 10) / 10,
      })
    }
  }

  return {
    isActive: true,
    message:
      anomalies.length > 0
        ? `${anomalies.length} item(s) exceeding SLA thresholds.`
        : 'All items are within expected timeframes.',
    anomalies,
  }
}

/**
 * Generate fallback tips when Claude API is unavailable.
 */
export function generateFallbackTips(
  stages: readonly Stage[],
  items: readonly Item[]
): readonly string[] {
  const tips: string[] = []

  // Find most populated stage
  const stageCounts = stages.map((s) => ({
    name: s.name,
    count: items.filter((i) => i.stageId === s.id).length,
  }))
  const busiest = [...stageCounts].sort((a, b) => b.count - a.count)[0]

  if (busiest && busiest.count > 0) {
    tips.push(
      `"${busiest.name}" has the most items (${busiest.count}). Consider reviewing stuck items or increasing throughput.`
    )
  }

  tips.push(
    'Review cycle time for each stage to identify where items slow down.'
  )
  tips.push(
    'Check if your conversion rates match industry benchmarks for your pipeline type.'
  )

  if (items.length < 10) {
    tips.push(
      `AI insights require 10+ items. You have ${items.length} items. Add more data for personalized recommendations.`
    )
  }

  return tips
}
