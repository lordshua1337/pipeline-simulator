'use client'

import { useMemo } from 'react'
import type { RevenueData } from '@/lib/workspace-types'
import { TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react'

interface RevenueForecastProps {
  data: RevenueData
  onChange: (data: RevenueData) => void
}

interface MonthData {
  readonly month: number
  readonly mrr: number
  readonly newRevenue: number
  readonly churnRevenue: number
  readonly expansionRevenue: number
  readonly customers: number
}

function projectRevenue(data: RevenueData, growthMult: number = 1, churnMult: number = 1): readonly MonthData[] {
  const months: MonthData[] = []
  let mrr = data.currentMRR
  let customers = data.avgNewCustomerValue > 0 ? Math.round(mrr / data.avgNewCustomerValue) : 100
  const growth = data.monthlyGrowthRate * growthMult
  const churn = data.monthlyChurnRate * churnMult

  for (let m = 0; m <= data.months; m++) {
    if (m === 0) {
      months.push({ month: m, mrr, newRevenue: 0, churnRevenue: 0, expansionRevenue: 0, customers })
      continue
    }
    const newRevenue = mrr * growth
    const churnRevenue = mrr * churn
    const expansionRevenue = mrr * data.expansionRate
    mrr = mrr + newRevenue - churnRevenue + expansionRevenue
    const newCustomers = data.avgNewCustomerValue > 0 ? Math.round(newRevenue / data.avgNewCustomerValue) : 0
    const churnedCustomers = Math.round(customers * churn)
    customers = customers + newCustomers - churnedCustomers
    months.push({ month: m, mrr, newRevenue, churnRevenue, expansionRevenue, customers })
  }
  return months
}

function fmt(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export function RevenueForecast({ data, onChange }: RevenueForecastProps) {
  const base = useMemo(() => projectRevenue(data), [data])
  const optimistic = useMemo(() => projectRevenue(data, data.scenarios.optimistic.growthMultiplier, data.scenarios.optimistic.churnMultiplier), [data])
  const pessimistic = useMemo(() => projectRevenue(data, data.scenarios.pessimistic.growthMultiplier, data.scenarios.pessimistic.churnMultiplier), [data])

  const lastBase = base[base.length - 1]
  const lastOpt = optimistic[optimistic.length - 1]
  const lastPess = pessimistic[pessimistic.length - 1]
  const arr = lastBase.mrr * 12
  const ltv = data.monthlyChurnRate > 0 ? data.avgNewCustomerValue / data.monthlyChurnRate : 0
  const maxMRR = Math.max(...optimistic.map((m) => m.mrr))

  const fields: { label: string; key: keyof RevenueData; step: string; pct?: boolean }[] = [
    { label: 'Current MRR', key: 'currentMRR', step: '500' },
    { label: 'Monthly Growth', key: 'monthlyGrowthRate', step: '0.01', pct: true },
    { label: 'Monthly Churn', key: 'monthlyChurnRate', step: '0.005', pct: true },
    { label: 'Expansion Rate', key: 'expansionRate', step: '0.005', pct: true },
    { label: 'Avg New Customer', key: 'avgNewCustomerValue', step: '10' },
    { label: 'Forecast Months', key: 'months', step: '1' },
  ]

  return (
    <div className="h-full overflow-y-auto p-6 max-w-5xl mx-auto">
      {/* Input grid */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {fields.map((f) => (
          <div key={f.key} className="bg-gray-50 rounded-lg px-4 py-3">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">{f.label}</label>
            <input
              type="number"
              value={f.pct ? ((data[f.key] as number) * 100).toFixed(1) : (data[f.key] as number)}
              onChange={(e) => {
                const raw = parseFloat(e.target.value)
                if (isNaN(raw)) return
                onChange({ ...data, [f.key]: f.pct ? raw / 100 : raw })
              }}
              step={f.pct ? '0.1' : f.step}
              className="w-full px-2 py-1.5 text-sm font-mono bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: `MRR (Month ${data.months})`, value: fmt(lastBase.mrr), icon: DollarSign, color: 'text-green-600' },
          { label: 'Projected ARR', value: fmt(arr), icon: TrendingUp, color: 'text-blue-600' },
          { label: 'Est. LTV', value: fmt(ltv), icon: Users, color: 'text-purple-600' },
          { label: 'Net Growth', value: `${((data.monthlyGrowthRate - data.monthlyChurnRate + data.expansionRate) * 100).toFixed(1)}%/mo`, icon: TrendingUp, color: 'text-cyan-600' },
        ].map((card) => (
          <div key={card.label} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <card.icon className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">{card.label}</span>
            </div>
            <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* MRR Growth Chart (bar-based) */}
      <div className="border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">MRR Projection</h3>
        <div className="flex items-end gap-1 h-48">
          {base.filter((_, i) => i > 0).map((m, i) => {
            const baseH = maxMRR > 0 ? (m.mrr / maxMRR) * 100 : 0
            const optH = maxMRR > 0 ? (optimistic[i + 1].mrr / maxMRR) * 100 : 0
            const pessH = maxMRR > 0 ? (pessimistic[i + 1].mrr / maxMRR) * 100 : 0
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                <div className="w-full flex items-end justify-center gap-px" style={{ height: '100%' }}>
                  <div className="w-1/4 bg-green-200 rounded-t" style={{ height: `${optH}%` }} />
                  <div className="w-1/3 bg-blue-400 rounded-t" style={{ height: `${baseH}%` }} />
                  <div className="w-1/4 bg-gray-300 rounded-t" style={{ height: `${pessH}%` }} />
                </div>
                {m.month % Math.ceil(data.months / 12) === 0 && (
                  <span className="text-[8px] text-gray-400 mt-1">M{m.month}</span>
                )}
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-[9px] px-2 py-1 rounded hidden group-hover:block whitespace-nowrap z-10">
                  M{m.month}: {fmt(m.mrr)}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 justify-center">
          {[
            { label: 'Optimistic', color: 'bg-green-200', value: fmt(lastOpt.mrr) },
            { label: 'Base', color: 'bg-blue-400', value: fmt(lastBase.mrr) },
            { label: 'Pessimistic', color: 'bg-gray-300', value: fmt(lastPess.mrr) },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <div className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
              {l.label}: {l.value}
            </div>
          ))}
        </div>
      </div>

      {/* Monthly breakdown */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Monthly Breakdown</h3>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="text-left py-1.5">Month</th>
                <th className="text-right py-1.5">MRR</th>
                <th className="text-right py-1.5">New</th>
                <th className="text-right py-1.5">Churn</th>
                <th className="text-right py-1.5">Expansion</th>
                <th className="text-right py-1.5">Customers</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {base.filter((_, i) => i > 0).map((m) => (
                <tr key={m.month} className="border-t border-gray-100">
                  <td className="py-1.5 font-mono">{m.month}</td>
                  <td className="py-1.5 font-mono text-right">{fmt(m.mrr)}</td>
                  <td className="py-1.5 font-mono text-right text-green-600">+{fmt(m.newRevenue)}</td>
                  <td className="py-1.5 font-mono text-right text-red-500">-{fmt(m.churnRevenue)}</td>
                  <td className="py-1.5 font-mono text-right text-blue-500">+{fmt(m.expansionRevenue)}</td>
                  <td className="py-1.5 font-mono text-right">{m.customers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
