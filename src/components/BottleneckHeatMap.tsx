'use client'

import { useMemo } from 'react'
import { getBottleneckScore, getStageHealth } from '@/lib/utils/health'
import type { Stage, Item } from '@/lib/types'

interface BottleneckHeatMapProps {
  readonly stages: readonly Stage[]
  readonly items: readonly Item[]
}

export default function BottleneckHeatMap({ stages, items }: BottleneckHeatMapProps) {
  const bottlenecks = useMemo(() => {
    return stages.map((stage) => {
      const stageItems = items.filter((i) => i.stageId === stage.id)
      const score = getBottleneckScore(stageItems)
      const health = getStageHealth(stageItems)
      return { stage, score, health, itemCount: stageItems.length }
    })
  }, [stages, items])

  const sorted = [...bottlenecks].sort((a, b) => b.score - a.score)

  const getHeatColor = (score: number): string => {
    if (score >= 70) return 'var(--red)'
    if (score >= 40) return 'var(--amber)'
    return 'var(--green)'
  }

  const getHeatBg = (score: number): string => {
    if (score >= 70) return 'var(--red-soft)'
    if (score >= 40) return 'var(--amber-soft)'
    return 'var(--green-soft)'
  }

  return (
    <div
      className="p-6 rounded-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <h3 className="text-lg font-bold mb-6">Bottleneck Analysis</h3>

      <div className="space-y-3">
        {sorted.map((bn) => (
          <div
            key={bn.stage.id}
            className="flex items-center gap-4 p-3 rounded-lg"
            style={{ background: getHeatBg(bn.score) }}
          >
            <div className="flex-1">
              <h4 className="font-medium text-sm">{bn.stage.name}</h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {bn.itemCount} item{bn.itemCount !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="w-20 h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--bg)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${bn.score}%`,
                    background: getHeatColor(bn.score),
                  }}
                />
              </div>
              <span
                className="text-xs font-bold w-8 text-right"
                style={{ color: getHeatColor(bn.score) }}
              >
                {bn.score}
              </span>
            </div>
          </div>
        ))}
      </div>

      {sorted.some((bn) => bn.score >= 70) && (
        <div
          className="mt-4 p-3 rounded-lg"
          style={{ background: 'var(--red-soft)' }}
        >
          <p className="text-sm" style={{ color: 'var(--red)' }}>
            <span className="font-bold">Bottleneck detected:</span>{' '}
            {sorted.find((bn) => bn.score >= 70)?.stage.name} has the highest congestion.
            Consider increasing throughput or splitting the stage.
          </p>
        </div>
      )}

      {sorted.every((bn) => bn.score < 40) && (
        <div
          className="mt-4 p-3 rounded-lg"
          style={{ background: 'var(--green-soft)' }}
        >
          <p className="text-sm" style={{ color: 'var(--green)' }}>
            All stages flowing smoothly. No bottlenecks detected.
          </p>
        </div>
      )}
    </div>
  )
}
