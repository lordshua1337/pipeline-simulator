'use client'

import { useState, useCallback } from 'react'
import { Play, BarChart3, TrendingUp, Zap } from 'lucide-react'

interface StageData {
  readonly name: string
  readonly count: number
  readonly color: string
  readonly value: number
}

const INITIAL_STAGES: readonly StageData[] = [
  { name: 'Prospect', count: 24, color: '#93c5fd', value: 480000 },
  { name: 'Discovery', count: 12, color: '#60a5fa', value: 360000 },
  { name: 'Proposal', count: 7, color: '#3b82f6', value: 315000 },
  { name: 'Negotiation', count: 3, color: '#2563eb', value: 195000 },
  { name: 'Closed Won', count: 2, color: '#1d4ed8', value: 130000 },
]

// Simple Monte Carlo simulation (pure client-side)
function runSimulation(stages: readonly StageData[], iterations: number): {
  outcomes: number[]
  median: number
  p10: number
  p90: number
  expectedValue: number
} {
  // Compute conversion rates between stages
  const rates = stages.slice(1).map((s, i) => {
    const prev = stages[i].count
    return prev > 0 ? s.count / prev : 0
  })

  const outcomes: number[] = []
  const avgDealSize = stages[stages.length - 1].value / Math.max(stages[stages.length - 1].count, 1)

  for (let i = 0; i < iterations; i++) {
    let pipeline = stages[0].count

    for (const rate of rates) {
      // Add randomness: +/-30% variance on each conversion rate
      const variance = 0.7 + Math.random() * 0.6
      const adjustedRate = Math.min(1, Math.max(0, rate * variance))
      pipeline = Math.round(pipeline * adjustedRate)
    }

    outcomes.push(pipeline * avgDealSize)
  }

  outcomes.sort((a, b) => a - b)

  const p10Index = Math.floor(iterations * 0.1)
  const medianIndex = Math.floor(iterations * 0.5)
  const p90Index = Math.floor(iterations * 0.9)

  return {
    outcomes,
    p10: outcomes[p10Index],
    median: outcomes[medianIndex],
    p90: outcomes[p90Index],
    expectedValue: Math.round(outcomes.reduce((s, v) => s + v, 0) / iterations),
  }
}

function formatCurrency(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${Math.round(n / 1000)}K`
  return `$${n}`
}

export function MiniPipelineDemo() {
  const [stages] = useState(INITIAL_STAGES)
  const [simResult, setSimResult] = useState<ReturnType<typeof runSimulation> | null>(null)
  const [running, setRunning] = useState(false)

  const handleSimulate = useCallback(() => {
    setRunning(true)
    setSimResult(null)

    // Simulate async feel
    setTimeout(() => {
      const result = runSimulation(stages, 1000)
      setSimResult(result)
      setRunning(false)
    }, 800)
  }, [stages])

  // Build histogram buckets from outcomes
  const histogram = simResult
    ? buildHistogram(simResult.outcomes, 12)
    : null

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Pipeline funnel */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--blue)' }}>
            Live Demo: Sales Pipeline
          </p>
          <button
            onClick={handleSimulate}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 disabled:opacity-60"
            style={{ background: 'var(--blue)' }}
          >
            {running ? (
              <>
                <Zap className="w-3.5 h-3.5 animate-pulse" />
                Running 1,000 futures...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Run Monte Carlo
              </>
            )}
          </button>
        </div>

        {/* Stage bars */}
        <div className="grid grid-cols-5 gap-3">
          {stages.map((s) => {
            const maxCount = stages[0].count
            const heightPct = (s.count / maxCount) * 100
            return (
              <div key={s.name} className="text-center">
                <div className="h-20 flex items-end justify-center mb-2">
                  <div
                    className="w-full rounded-t-md transition-all duration-500"
                    style={{
                      height: `${Math.max(10, heightPct)}%`,
                      background: s.color,
                      opacity: 0.85,
                    }}
                  />
                </div>
                <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{s.count}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{s.name}</div>
                <div className="text-[10px] font-medium" style={{ color: 'var(--blue)' }}>
                  {formatCurrency(s.value)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Conversion rates */}
        <div className="flex items-center gap-1 mt-3 justify-center">
          {stages.slice(1).map((s, i) => {
            const rate = stages[i].count > 0 ? (s.count / stages[i].count * 100).toFixed(0) : '0'
            return (
              <div key={s.name} className="flex items-center gap-1">
                {i > 0 && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>|</span>}
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {rate}%
                </span>
              </div>
            )
          })}
          <span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>conversion rates</span>
        </div>
      </div>

      {/* Simulation results */}
      {simResult && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {/* Forecast summary */}
          <div className="grid grid-cols-3 gap-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <ForecastCell
              label="Conservative (P10)"
              value={formatCurrency(simResult.p10)}
              color="var(--red)"
            />
            <ForecastCell
              label="Most Likely (P50)"
              value={formatCurrency(simResult.median)}
              color="var(--blue)"
              highlight
            />
            <ForecastCell
              label="Optimistic (P90)"
              value={formatCurrency(simResult.p90)}
              color="var(--green)"
            />
          </div>

          {/* Histogram */}
          {histogram && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4" style={{ color: 'var(--blue)' }} />
                <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  1,000 Simulated Outcomes
                </span>
              </div>
              <div className="flex items-end gap-1 h-16">
                {histogram.map((bucket, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all"
                    style={{
                      height: `${(bucket.count / histogram.reduce((max, b) => Math.max(max, b.count), 1)) * 100}%`,
                      background: bucket.containsMedian ? 'var(--blue)' : 'rgba(59,130,246,0.2)',
                      minHeight: '2px',
                    }}
                    title={`${formatCurrency(bucket.min)} - ${formatCurrency(bucket.max)}: ${bucket.count} outcomes`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {formatCurrency(histogram[0].min)}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {formatCurrency(histogram[histogram.length - 1].max)}
                </span>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="p-4 text-center" style={{ background: 'var(--bg)' }}>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              This is a 30-second demo. Build your own pipeline in the dashboard.
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:scale-105"
              style={{ background: 'var(--blue)' }}
            >
              <TrendingUp className="w-4 h-4" />
              Model Your Process
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

function ForecastCell({ label, value, color, highlight }: {
  label: string
  value: string
  color: string
  highlight?: boolean
}) {
  return (
    <div
      className="p-4 text-center"
      style={{
        borderRight: '1px solid var(--border)',
        background: highlight ? 'rgba(59,130,246,0.04)' : undefined,
      }}
    >
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  )
}

function buildHistogram(values: number[], bucketCount: number) {
  const min = values[0]
  const max = values[values.length - 1]
  const range = max - min || 1
  const bucketSize = range / bucketCount
  const median = values[Math.floor(values.length / 2)]

  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    min: min + i * bucketSize,
    max: min + (i + 1) * bucketSize,
    count: 0,
    containsMedian: false,
  }))

  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / bucketSize), bucketCount - 1)
    buckets[idx].count++
  }

  // Mark median bucket
  const medianIdx = Math.min(Math.floor((median - min) / bucketSize), bucketCount - 1)
  buckets[medianIdx].containsMedian = true

  return buckets
}
