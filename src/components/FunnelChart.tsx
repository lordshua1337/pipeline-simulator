'use client'

import { TrendingDown } from 'lucide-react'
import type { Stage, Item } from '@/lib/types'

interface FunnelChartProps {
  readonly stages: readonly Stage[]
  readonly items: readonly Item[]
  readonly benchmarks?: Record<string, number>
}

export default function FunnelChart({ stages, items, benchmarks }: FunnelChartProps) {
  const stageData = stages.map((stage) => ({
    stage,
    count: items.filter((i) => i.stageId === stage.id).length,
  }))

  const maxCount = Math.max(...stageData.map((s) => s.count), 1)

  return (
    <div
      className="p-6 rounded-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <h3 className="text-lg font-bold mb-6">Conversion Funnel</h3>

      <div className="space-y-4">
        {stageData.map((data, index) => {
          const percentage = (data.count / maxCount) * 100
          const dropoff =
            index > 0 && stageData[index - 1].count > 0
              ? ((stageData[index - 1].count - data.count) /
                  stageData[index - 1].count) *
                100
              : 0

          // Get benchmark for this transition
          const benchmarkKey =
            index > 0
              ? `${stageData[index - 1].stage.name}->${data.stage.name}`
              : null
          const benchmark =
            benchmarkKey && benchmarks ? benchmarks[benchmarkKey] : undefined

          return (
            <div key={data.stage.id}>
              <div className="flex items-end justify-between mb-1.5">
                <h4 className="font-medium text-sm">{data.stage.name}</h4>
                <div className="text-right">
                  <p className="text-sm font-bold">{data.count}</p>
                  {dropoff > 0 && (
                    <p
                      className="text-xs flex items-center gap-0.5 justify-end"
                      style={{ color: 'var(--red)' }}
                    >
                      <TrendingDown size={10} />
                      {dropoff.toFixed(0)}% drop
                    </p>
                  )}
                </div>
              </div>

              <div className="relative">
                <div
                  className="w-full h-7 rounded overflow-hidden"
                  style={{ background: 'var(--bg)' }}
                >
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${percentage}%`,
                      background: data.stage.color,
                    }}
                  />
                </div>

                {/* Benchmark reference line */}
                {benchmark !== undefined && index > 0 && (
                  <div
                    className="absolute top-0 h-7 border-r-2 border-dashed"
                    style={{
                      left: `${benchmark * 100}%`,
                      borderColor: 'var(--text-muted)',
                    }}
                    data-testid="benchmark-line"
                  >
                    <span
                      className="absolute -top-4 -translate-x-1/2 text-[9px] whitespace-nowrap"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Industry Average: {Math.round(benchmark * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div
        className="mt-6 pt-4 grid grid-cols-3 gap-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total</p>
          <p className="text-xl font-black">{items.length}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>First Stage</p>
          <p className="text-xl font-black">{stageData[0]?.count ?? 0}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Last Stage</p>
          <p className="text-xl font-black" style={{ color: 'var(--green)' }}>
            {stageData[stageData.length - 1]?.count ?? 0}
          </p>
        </div>
      </div>
    </div>
  )
}
