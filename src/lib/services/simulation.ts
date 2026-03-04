// Pipeline Simulator -- Monte Carlo Simulation Engine

import type {
  Stage,
  Item,
  MonteCarloResult,
  SensitivityResult,
  ForecastResult,
  DataSufficiencyCheck,
  StageHistory,
} from '../types'

const MAX_ITERATIONS = 10000
const SIMULATION_TIMEOUT_MS = 30000

interface PipelineSnapshot {
  readonly stages: readonly Stage[]
  readonly itemsByStage: Record<string, readonly Item[]>
}

interface StageMetrics {
  readonly conversionRate: number
  readonly avgTimeSeconds: number
  readonly stdDevSeconds: number
}

// Check data sufficiency for simulation
export function checkDataSufficiency(
  items: readonly Item[],
  history: readonly StageHistory[],
  requiredCount: number = 10
): DataSufficiencyCheck {
  // Count items that have moved through at least one stage
  const itemsWithHistory = new Set(history.map((h) => h.itemId))
  const completedCount = itemsWithHistory.size

  const hasEnoughData = completedCount >= requiredCount

  let message: string
  if (completedCount >= 20) {
    message = 'Sufficient data for accurate forecasting.'
  } else if (completedCount >= 10) {
    message = `You have ${completedCount} items with stage history. Add more for higher confidence.`
  } else {
    message = `Forecasting requires at least ${requiredCount} items with stage transitions. You have ${completedCount}. You can still run simulations with manual conversion rates.`
  }

  return {
    hasEnoughData,
    completedItemCount: completedCount,
    requiredCount,
    message,
    readinessBadge: completedCount >= 20 ? 'Ready' : 'Beta (limited data)',
  }
}

// Box-Muller transform for normal distribution sampling
function normalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stdDev
}

// Extract metrics from pipeline snapshot
function extractMetrics(
  snapshot: PipelineSnapshot,
  history: readonly StageHistory[],
  manualRates?: Record<string, number>
): readonly StageMetrics[] {
  return snapshot.stages.map((stage) => {
    const items = snapshot.itemsByStage[stage.id] ?? []

    if (manualRates && manualRates[stage.name] !== undefined) {
      return {
        conversionRate: manualRates[stage.name],
        avgTimeSeconds: 3 * 24 * 3600,
        stdDevSeconds: 1 * 24 * 3600,
      }
    }

    // Calculate from history
    const stageTransitions = history.filter((h) => h.fromStageId === stage.id)
    const stageEntries = history.filter((h) => h.toStageId === stage.id)

    const conversionRate =
      stageEntries.length > 0
        ? Math.min(1, stageTransitions.length / stageEntries.length)
        : 0.7

    const times = stageTransitions
      .map((h) => h.timeInStageSeconds)
      .filter((t): t is number => t !== null && t > 0)

    const avgTime =
      times.length > 0
        ? times.reduce((a, b) => a + b, 0) / times.length
        : items.length > 0
          ? items.reduce((sum, item) => {
              const entered = new Date(item.enteredAt).getTime()
              return sum + (Date.now() - entered) / 1000
            }, 0) / items.length
          : 3 * 24 * 3600

    const variance =
      times.length > 1
        ? times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) /
          times.length
        : Math.pow(avgTime * 0.3, 2)

    return {
      conversionRate: Math.max(0.1, Math.min(1, conversionRate)),
      avgTimeSeconds: Math.max(3600, avgTime),
      stdDevSeconds: Math.max(1800, Math.sqrt(variance)),
    }
  })
}

// Run a single simulation iteration
function runIteration(
  stageCount: number,
  metrics: readonly StageMetrics[],
  startingItems: number
): { readonly itemsCompleted: number; readonly totalTimeSeconds: number } {
  let remaining = startingItems
  let totalTime = 0

  for (let i = 0; i < stageCount; i++) {
    const m = metrics[i]
    // For each item in stage, sample whether it advances
    let advancing = 0
    for (let j = 0; j < remaining; j++) {
      if (Math.random() < m.conversionRate) {
        advancing++
        totalTime += Math.max(0, normalRandom(m.avgTimeSeconds, m.stdDevSeconds))
      }
    }
    remaining = advancing
  }

  return { itemsCompleted: remaining, totalTimeSeconds: totalTime }
}

// Run Monte Carlo simulation
export function runMonteCarlo(
  snapshot: PipelineSnapshot,
  history: readonly StageHistory[],
  options: {
    readonly iterations?: number
    readonly manualRates?: Record<string, number>
  } = {}
): MonteCarloResult {
  const iterations = Math.min(options.iterations ?? 1000, MAX_ITERATIONS)
  const metrics = extractMetrics(snapshot, history, options.manualRates)

  const totalItems = Object.values(snapshot.itemsByStage).flat().length
  const startingItems = Math.max(10, totalItems)

  const startTime = Date.now()
  const results: number[] = []

  for (let i = 0; i < iterations; i++) {
    if (Date.now() - startTime > SIMULATION_TIMEOUT_MS) break

    const { itemsCompleted } = runIteration(
      snapshot.stages.length,
      metrics,
      startingItems
    )
    results.push(itemsCompleted)
  }

  // Statistics
  const mean = results.reduce((a, b) => a + b, 0) / results.length
  const variance =
    results.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / results.length
  const stdDev = Math.sqrt(variance)
  const se = stdDev / Math.sqrt(results.length)
  const ci95 = 1.96 * se

  const sorted = [...results].sort((a, b) => a - b)
  const percentile = (p: number) => sorted[Math.floor(sorted.length * p)] ?? 0

  return {
    meanThroughput: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    confidenceInterval95: [
      Math.round((mean - ci95) * 100) / 100,
      Math.round((mean + ci95) * 100) / 100,
    ],
    percentiles: {
      p10: percentile(0.1),
      p25: percentile(0.25),
      p50: percentile(0.5),
      p75: percentile(0.75),
      p90: percentile(0.9),
    },
    iterations: results.length,
  }
}

// Run sensitivity analysis
export function runSensitivityAnalysis(
  snapshot: PipelineSnapshot,
  history: readonly StageHistory[],
  options: {
    readonly iterations?: number
    readonly manualRates?: Record<string, number>
  } = {}
): readonly SensitivityResult[] {
  const iterations = Math.min(options.iterations ?? 500, MAX_ITERATIONS)
  const baseMetrics = extractMetrics(snapshot, history, options.manualRates)

  // Baseline
  const baseline = runMonteCarlo(snapshot, history, {
    iterations,
    manualRates: options.manualRates,
  })

  const results: SensitivityResult[] = snapshot.stages.map((stage, idx) => {
    const originalRate = baseMetrics[idx].conversionRate

    // Perturb conversion rate up by 10%
    const perturbedRates: Record<string, number> = {}
    snapshot.stages.forEach((s, i) => {
      perturbedRates[s.name] =
        i === idx
          ? Math.min(1, originalRate * 1.1)
          : baseMetrics[i].conversionRate
    })

    const perturbed = runMonteCarlo(snapshot, history, {
      iterations: Math.floor(iterations / 2),
      manualRates: perturbedRates,
    })

    const impact =
      baseline.meanThroughput > 0
        ? (perturbed.meanThroughput - baseline.meanThroughput) /
          baseline.meanThroughput
        : 0

    return {
      parameter: `${stage.name} Conversion Rate`,
      impactOnThroughput: Math.round(impact * 1000) / 1000,
      rank: 0,
    }
  })

  // Rank by absolute impact
  const ranked = [...results]
    .sort(
      (a, b) =>
        Math.abs(b.impactOnThroughput) - Math.abs(a.impactOnThroughput)
    )
    .map((r, i) => ({ ...r, rank: i + 1 }))

  return ranked
}

// Forecast based on current velocity
export function runForecast(
  snapshot: PipelineSnapshot,
  history: readonly StageHistory[],
  days: number = 30
): ForecastResult {
  const totalItems = Object.values(snapshot.itemsByStage).flat().length
  const recentHistory = history.filter((h) => {
    const movedAt = new Date(h.movedAt).getTime()
    return Date.now() - movedAt < 7 * 24 * 3600 * 1000
  })

  const dailyVelocity = recentHistory.length > 0 ? recentHistory.length / 7 : 1
  const estimated = Math.round(dailyVelocity * days)
  const stdDev = dailyVelocity * 0.3
  const ci95 = 1.96 * stdDev * Math.sqrt(days)

  return {
    estimatedCompletions: Math.max(0, Math.min(estimated, totalItems)),
    confidenceInterval95: [
      Math.max(0, Math.round(estimated - ci95)),
      Math.round(estimated + ci95),
    ],
    projectedDate: new Date(Date.now() + days * 24 * 3600 * 1000)
      .toISOString()
      .split('T')[0],
  }
}
