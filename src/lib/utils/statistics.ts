// Shared statistical utilities

export function normalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
  return mean + z * stdDev
}

export function calculateMean(data: readonly number[]): number {
  if (data.length === 0) return 0
  return data.reduce((sum, v) => sum + v, 0) / data.length
}

export function calculateStdDev(data: readonly number[], mean: number): number {
  if (data.length < 2) return 0
  const variance = data.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (data.length - 1)
  return Math.sqrt(variance)
}

export function calculatePercentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower)
}

export function calculateMedian(sorted: readonly number[]): number {
  return calculatePercentile(sorted, 50)
}
