'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, DollarSign, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react'
import type { FlowSimulationResult, FlowMonteCarloResult } from '@/lib/flow-types'

interface FlowResultsProps {
  result: FlowSimulationResult | null
  monteCarlo: FlowMonteCarloResult | null
  onClose: () => void
}

function formatMoney(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

export function FlowResults({ result, monteCarlo, onClose }: FlowResultsProps) {
  const [expanded, setExpanded] = useState(true)

  if (!result) return null

  return (
    <div className={`border-t border-gray-200 bg-white transition-all ${expanded ? 'h-[280px]' : 'h-10'}`}>
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 h-10 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5" />
          Simulation Results
        </div>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 overflow-y-auto" style={{ height: 'calc(100% - 40px)' }}>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Revenue', value: formatMoney(result.totalRevenue), color: 'text-green-600', icon: DollarSign },
              { label: 'Cost', value: formatMoney(result.totalCost), color: 'text-red-500', icon: DollarSign },
              { label: 'Net Profit', value: formatMoney(result.netProfit), color: result.netProfit >= 0 ? 'text-green-600' : 'text-red-500', icon: TrendingUp },
              { label: 'ROI', value: `${result.roi.toFixed(0)}%`, color: result.roi >= 0 ? 'text-green-600' : 'text-red-500', icon: TrendingUp },
            ].map((card) => (
              <div key={card.label} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <card.icon className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">{card.label}</span>
                </div>
                <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Per-node breakdown */}
            <div>
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Node Breakdown</h4>
              <div className="space-y-1">
                {result.perNodeResults.map((nr) => (
                  <div
                    key={nr.nodeId}
                    className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${
                      nr.nodeId === result.bottleneckNodeId ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {nr.nodeId === result.bottleneckNodeId && (
                        <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      )}
                      <span className="truncate text-gray-700">{nr.label}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-mono text-gray-500">{Math.round(nr.trafficIn)} in</span>
                      <span className="font-mono text-gray-500">{(nr.conversionRate * 100).toFixed(0)}%</span>
                      {nr.revenue > 0 && (
                        <span className="font-mono text-green-600">{formatMoney(nr.revenue)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monte Carlo */}
            {monteCarlo && (
              <div>
                <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Monte Carlo ({monteCarlo.iterations} iterations)
                </h4>
                <div className="space-y-2">
                  {[
                    { label: 'Mean', value: formatMoney(monteCarlo.mean) },
                    { label: 'Median', value: formatMoney(monteCarlo.median) },
                    { label: 'Best Case (P95)', value: formatMoney(monteCarlo.p95) },
                    { label: 'Worst Case (P5)', value: formatMoney(monteCarlo.p5) },
                    { label: 'Std Dev', value: formatMoney(monteCarlo.stdDev) },
                    { label: 'Range', value: `${formatMoney(monteCarlo.min)} to ${formatMoney(monteCarlo.max)}` },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between px-2 py-1 text-xs">
                      <span className="text-gray-500">{row.label}</span>
                      <span className="font-mono text-gray-700">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
