'use client'

import { useState } from 'react'
import { X, AlertTriangle, ChevronDown, ChevronRight, Play } from 'lucide-react'
import type { FlowSimulationResult, FlowMonteCarloResult } from '@/lib/flow-types'

interface FlowResultsProps {
  result: FlowSimulationResult | null
  monteCarlo: FlowMonteCarloResult | null
  onClose: () => void
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

export function FlowResults({ result, monteCarlo, onClose }: FlowResultsProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('summary')

  if (!result) return null

  const toggle = (id: string) => setExpandedSection((prev) => (prev === id ? null : id))

  // Build histogram buckets from Monte Carlo
  const histogram = (() => {
    if (!monteCarlo || monteCarlo.distribution.length === 0) return null
    const bucketCount = 12
    const min = monteCarlo.min
    const max = monteCarlo.max
    const range = max - min || 1
    const bucketSize = range / bucketCount
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      min: min + i * bucketSize,
      max: min + (i + 1) * bucketSize,
      count: 0,
    }))
    for (const val of monteCarlo.distribution) {
      const idx = Math.min(bucketCount - 1, Math.floor((val - min) / bucketSize))
      buckets[idx].count++
    }
    const maxCount = Math.max(...buckets.map((b) => b.count))
    return { buckets, maxCount }
  })()

  const sections = [
    {
      id: 'summary',
      label: 'Summary',
      content: (
        <div className="space-y-1 py-1">
          {[
            { label: 'Revenue', value: fmt(result.totalRevenue), color: '#1A1A1A', bold: true },
            { label: 'Total Cost', value: fmt(result.totalCost), color: '#6B7280' },
            { label: 'Net Profit', value: fmt(result.netProfit), color: result.netProfit >= 0 ? '#10B981' : '#EF4444', bold: true },
            { label: 'ROI', value: `${result.roi.toFixed(0)}%`, color: result.roi >= 0 ? '#10B981' : '#EF4444' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-1.5 px-1">
              <span className="text-[11px] text-gray-500">{row.label}</span>
              <span
                className={`text-[13px] font-mono ${row.bold ? 'font-bold' : 'font-medium'}`}
                style={{ color: row.color }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'nodes',
      label: `Nodes (${result.perNodeResults.length})`,
      content: (
        <div className="space-y-0.5 py-1">
          {result.perNodeResults.map((nr) => {
            const isBottleneck = nr.nodeId === result.bottleneckNodeId
            const barW = result.perNodeResults[0]?.trafficIn > 0
              ? (nr.trafficIn / result.perNodeResults[0].trafficIn) * 100
              : 0

            return (
              <div key={nr.nodeId} className={`rounded-lg px-2.5 py-2 ${isBottleneck ? 'bg-amber-50' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {isBottleneck && <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />}
                    <span className="text-[11px] font-medium text-gray-800 truncate">{nr.label}</span>
                  </div>
                  {nr.revenue > 0 && (
                    <span className="text-[10px] font-mono text-emerald-600 font-medium">{fmt(nr.revenue)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(barW, 2)}%`, background: isBottleneck ? '#F59E0B' : '#10B981' }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-gray-400 w-16 text-right">
                    {Math.round(nr.trafficIn)} / {(nr.conversionRate * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ),
    },
  ]

  if (monteCarlo) {
    sections.push({
      id: 'montecarlo',
      label: `Monte Carlo (${monteCarlo.iterations})`,
      content: (
        <div className="py-1">
          {/* Histogram */}
          {histogram && (
            <div className="mb-3">
              <div className="flex items-end gap-[2px] h-16">
                {histogram.buckets.map((b, i) => {
                  const h = histogram.maxCount > 0 ? (b.count / histogram.maxCount) * 100 : 0
                  const isMean = monteCarlo.mean >= b.min && monteCarlo.mean < b.max
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end h-full group relative">
                      <div
                        className="w-full rounded-t transition-all"
                        style={{
                          height: `${h}%`,
                          minHeight: b.count > 0 ? 2 : 0,
                          background: isMean ? '#10B981' : '#E5E7EB',
                        }}
                      />
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[8px] px-1.5 py-0.5 rounded hidden group-hover:block whitespace-nowrap z-10">
                        {fmt(b.min)} - {fmt(b.max)}: {b.count}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[8px] font-mono text-gray-400">{fmt(monteCarlo.min)}</span>
                <span className="text-[8px] font-mono text-gray-400">{fmt(monteCarlo.max)}</span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="space-y-1">
            {[
              { label: 'Mean', value: fmt(monteCarlo.mean), highlight: true },
              { label: 'Median', value: fmt(monteCarlo.median) },
              { label: 'Best Case (P95)', value: fmt(monteCarlo.p95) },
              { label: 'Worst Case (P5)', value: fmt(monteCarlo.p5) },
              { label: 'Std Dev', value: fmt(monteCarlo.stdDev) },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-1 px-1">
                <span className="text-[10px] text-gray-500">{row.label}</span>
                <span
                  className={`text-[11px] font-mono ${row.highlight ? 'font-bold text-gray-900' : 'text-gray-600'}`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ),
    })
  }

  return (
    <div className="w-[280px] border-l flex-shrink-0 overflow-y-auto flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Play className="w-3 h-3" style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Simulation</span>
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center">
          <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Accordion sections */}
      <div className="flex-1">
        {sections.map((section) => {
          const isOpen = expandedSection === section.id
          return (
            <div key={section.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {section.label}
                </span>
                {isOpen ? (
                  <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                ) : (
                  <ChevronRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                )}
              </button>
              {isOpen && <div className="px-3 pb-3">{section.content}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
