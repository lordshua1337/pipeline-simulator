'use client'

import { X, DollarSign, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react'
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
  if (!result) return null

  return (
    <div className="w-[300px] border-l border-gray-200 bg-white flex-shrink-0 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">Results</span>
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center">
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-b border-gray-100 space-y-3">
        {[
          { label: 'Revenue', value: fmt(result.totalRevenue), color: result.totalRevenue > 0 ? '#1A1A1A' : '#9CA3AF' },
          { label: 'Cost', value: fmt(result.totalCost), color: '#6B7280' },
          { label: 'Net Profit', value: fmt(result.netProfit), color: result.netProfit >= 0 ? '#10B981' : '#EF4444' },
          { label: 'ROI', value: `${result.roi.toFixed(0)}%`, color: result.roi >= 0 ? '#10B981' : '#EF4444' },
        ].map((card) => (
          <div key={card.label} className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-gray-400">{card.label}</span>
            <span
              className="text-sm font-bold"
              style={{ fontFamily: "'SF Mono', monospace", color: card.color }}
            >
              {card.value}
            </span>
          </div>
        ))}
      </div>

      {/* Node breakdown */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Node Breakdown</div>
        <div className="space-y-1">
          {result.perNodeResults.map((nr) => (
            <div
              key={nr.nodeId}
              className={`flex items-center justify-between px-2 py-1.5 rounded text-[10px] ${
                nr.nodeId === result.bottleneckNodeId ? 'bg-amber-50' : ''
              }`}
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {nr.nodeId === result.bottleneckNodeId && (
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />
                )}
                <span className="truncate text-gray-700">{nr.label}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 font-mono text-gray-500">
                <span>{Math.round(nr.trafficIn)}</span>
                <span className="text-gray-300">|</span>
                <span>{(nr.conversionRate * 100).toFixed(0)}%</span>
                {nr.revenue > 0 && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-green-600">{fmt(nr.revenue)}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monte Carlo */}
      {monteCarlo && (
        <div className="px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
            Monte Carlo ({monteCarlo.iterations})
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'Mean', value: fmt(monteCarlo.mean) },
              { label: 'Median', value: fmt(monteCarlo.median) },
              { label: 'Best (P95)', value: fmt(monteCarlo.p95) },
              { label: 'Worst (P5)', value: fmt(monteCarlo.p5) },
              { label: 'Std Dev', value: fmt(monteCarlo.stdDev) },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500">{row.label}</span>
                <span className="font-mono text-gray-700">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
