'use client'

import { useMemo } from 'react'
import type { PricingData } from '@/lib/workspace-types'
import { DollarSign, TrendingUp, Target } from 'lucide-react'

interface PricingSimProps {
  data: PricingData
  onChange: (data: PricingData) => void
}

function demandAtPrice(basePrice: number, baseVolume: number, elasticity: number, testPrice: number): number {
  if (basePrice <= 0) return baseVolume
  const pctChange = (testPrice - basePrice) / basePrice
  return Math.max(0, Math.round(baseVolume * (1 - elasticity * pctChange)))
}

function fmt(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export function PricingSim({ data, onChange }: PricingSimProps) {
  const analysis = useMemo(() => {
    return data.pricePoints.map((price) => {
      const volume = demandAtPrice(data.currentPrice, data.currentVolume, data.elasticity, price)
      const revenue = price * volume
      const cost = data.costPerUnit * volume
      const profit = revenue - cost
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0
      return { price, volume, revenue, cost, profit, margin }
    })
  }, [data])

  const currentRevenue = data.currentPrice * data.currentVolume
  const currentProfit = currentRevenue - data.costPerUnit * data.currentVolume
  const optimal = analysis.reduce((best, a) => a.profit > best.profit ? a : best, analysis[0])
  const maxRevenue = Math.max(...analysis.map((a) => a.revenue))
  const maxProfit = Math.max(...analysis.map((a) => a.profit))

  const fields: { label: string; key: keyof PricingData; step: string }[] = [
    { label: 'Current Price', key: 'currentPrice', step: '1' },
    { label: 'Current Volume', key: 'currentVolume', step: '10' },
    { label: 'Elasticity', key: 'elasticity', step: '0.1' },
    { label: 'Cost Per Unit', key: 'costPerUnit', step: '1' },
  ]

  return (
    <div className="h-full overflow-y-auto p-6 max-w-5xl mx-auto">
      {/* Inputs */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {fields.map((f) => (
          <div key={f.key} className="bg-gray-50 rounded-lg px-4 py-3">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">{f.label}</label>
            <input
              type="number"
              value={data[f.key] as number}
              onChange={(e) => onChange({ ...data, [f.key]: parseFloat(e.target.value) || 0 })}
              step={f.step}
              className="w-full px-2 py-1.5 text-sm font-mono bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Current Revenue', value: fmt(currentRevenue), sub: `${data.currentVolume} units @ $${data.currentPrice}`, color: 'text-gray-700' },
          { label: 'Optimal Price', value: `$${optimal.price}`, sub: `${fmt(optimal.profit)} profit at ${optimal.volume} units`, color: 'text-green-600' },
          { label: 'Profit Opportunity', value: fmt(optimal.profit - currentProfit), sub: optimal.profit > currentProfit ? 'vs current pricing' : 'current pricing is optimal', color: optimal.profit > currentProfit ? 'text-blue-600' : 'text-gray-500' },
        ].map((card) => (
          <div key={card.label} className="bg-gray-50 rounded-lg p-4">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{card.label}</div>
            <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue curve */}
      <div className="border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue & Profit Curve</h3>
        <div className="flex items-end gap-2 h-48">
          {analysis.map((a) => {
            const revH = maxRevenue > 0 ? (a.revenue / maxRevenue) * 100 : 0
            const profH = maxProfit > 0 ? (Math.max(0, a.profit) / maxProfit) * 50 : 0
            const isCurrent = a.price === data.currentPrice
            const isOptimal = a.price === optimal.price
            return (
              <div key={a.price} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="w-full flex items-end justify-center gap-px" style={{ height: '100%' }}>
                  <div
                    className={`w-1/2 rounded-t transition-colors ${isCurrent ? 'bg-blue-500' : isOptimal ? 'bg-green-500' : 'bg-blue-300'}`}
                    style={{ height: `${revH}%` }}
                  />
                  <div
                    className={`w-1/2 rounded-t ${isOptimal ? 'bg-green-300' : 'bg-gray-300'}`}
                    style={{ height: `${profH * 2}%` }}
                  />
                </div>
                <span className={`text-[9px] font-mono ${isCurrent ? 'text-blue-600 font-bold' : isOptimal ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
                  ${a.price}
                </span>
                <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-[9px] px-2 py-1 rounded hidden group-hover:block whitespace-nowrap z-10">
                  Rev: {fmt(a.revenue)} | Profit: {fmt(a.profit)} | Vol: {a.volume}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 justify-center text-[10px] text-gray-500">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-300" />Revenue</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-gray-300" />Profit</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />Current</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-green-500" />Optimal</div>
        </div>
      </div>

      {/* Price point table */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Point Analysis</h3>
        <table className="w-full text-xs">
          <thead className="text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="text-left py-1.5">Price</th>
              <th className="text-right py-1.5">Volume</th>
              <th className="text-right py-1.5">Revenue</th>
              <th className="text-right py-1.5">Cost</th>
              <th className="text-right py-1.5">Profit</th>
              <th className="text-right py-1.5">Margin</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {analysis.map((a) => (
              <tr key={a.price} className={`border-t border-gray-100 ${a.price === optimal.price ? 'bg-green-50' : a.price === data.currentPrice ? 'bg-blue-50' : ''}`}>
                <td className="py-1.5 font-mono font-medium">${a.price}</td>
                <td className="py-1.5 font-mono text-right">{a.volume.toLocaleString()}</td>
                <td className="py-1.5 font-mono text-right">{fmt(a.revenue)}</td>
                <td className="py-1.5 font-mono text-right text-red-500">{fmt(a.cost)}</td>
                <td className="py-1.5 font-mono text-right text-green-600">{fmt(a.profit)}</td>
                <td className="py-1.5 font-mono text-right">{a.margin.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
