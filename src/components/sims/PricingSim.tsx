'use client'

import { useMemo } from 'react'
import type { PricingData } from '@/lib/workspace-types'

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
  const maxProfit = Math.max(...analysis.map((a) => Math.max(0, a.profit)))
  const profitDelta = optimal.profit - currentProfit

  const fields: { label: string; key: keyof PricingData; prefix?: string }[] = [
    { label: 'Current Price', key: 'currentPrice', prefix: '$' },
    { label: 'Volume / Month', key: 'currentVolume' },
    { label: 'Elasticity', key: 'elasticity' },
    { label: 'COGS / Unit', key: 'costPerUnit', prefix: '$' },
  ]

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        {/* Inputs -- inline, minimal */}
        <div className="flex items-center gap-6 mb-8">
          {fields.map((f) => (
            <div key={f.key} className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {f.label}
              </span>
              <div className="relative">
                {f.prefix && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {f.prefix}
                  </span>
                )}
                <input
                  type="number"
                  value={data[f.key] as number}
                  onChange={(e) => onChange({ ...data, [f.key]: parseFloat(e.target.value) || 0 })}
                  className="sim-input w-28 text-right"
                  style={{ paddingLeft: f.prefix ? '24px' : '12px' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Hero numbers */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="sim-card">
            <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              Current
            </div>
            <div className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'SF Mono', monospace", color: 'var(--text)' }}>
              {fmt(currentRevenue)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {data.currentVolume.toLocaleString()} units @ ${data.currentPrice}
            </div>
          </div>

          <div className="sim-card" style={{ borderColor: 'var(--accent)', borderWidth: '1px' }}>
            <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
              Optimal Price
            </div>
            <div className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'SF Mono', monospace", color: 'var(--accent)' }}>
              ${optimal.price}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {fmt(optimal.profit)} profit at {optimal.volume.toLocaleString()} units
            </div>
          </div>

          <div className="sim-card">
            <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: profitDelta > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
              Opportunity
            </div>
            <div
              className="text-3xl font-bold tracking-tight"
              style={{ fontFamily: "'SF Mono', monospace", color: profitDelta > 0 ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {profitDelta > 0 ? '+' : ''}{fmt(profitDelta)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {profitDelta > 0 ? 'additional profit available' : 'current pricing is optimal'}
            </div>
          </div>
        </div>

        {/* Revenue + Profit curve */}
        <div className="sim-card mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>
            Revenue &amp; Profit by Price Point
          </div>

          <div className="flex items-end gap-[3px] h-52">
            {analysis.map((a) => {
              const revH = maxRevenue > 0 ? (a.revenue / maxRevenue) * 100 : 0
              const profH = maxProfit > 0 ? (Math.max(0, a.profit) / maxProfit) * 48 : 0
              const isCurrent = a.price === data.currentPrice
              const isOptimal = a.price === optimal.price

              return (
                <div key={a.price} className="flex-1 flex flex-col items-center group relative" style={{ height: '100%' }}>
                  <div className="w-full flex items-end justify-center gap-[1px]" style={{ height: '100%' }}>
                    {/* Revenue bar */}
                    <div
                      className="w-[45%] rounded-t transition-all duration-300"
                      style={{
                        height: `${revH}%`,
                        background: isCurrent
                          ? 'var(--blue)'
                          : isOptimal
                          ? 'var(--accent)'
                          : 'rgba(255,255,255,0.08)',
                        minHeight: revH > 0 ? 2 : 0,
                      }}
                    />
                    {/* Profit bar */}
                    <div
                      className="w-[45%] rounded-t transition-all duration-300"
                      style={{
                        height: `${profH * 2}%`,
                        background: isOptimal
                          ? 'rgba(16, 185, 129, 0.4)'
                          : isCurrent
                          ? 'rgba(59, 130, 246, 0.4)'
                          : 'rgba(255,255,255,0.04)',
                        minHeight: profH > 0 ? 2 : 0,
                      }}
                    />
                  </div>
                  <span
                    className="text-[9px] mt-2"
                    style={{
                      fontFamily: "'SF Mono', monospace",
                      color: isCurrent ? 'var(--blue)' : isOptimal ? 'var(--accent)' : 'var(--text-muted)',
                      fontWeight: isCurrent || isOptimal ? 700 : 400,
                    }}
                  >
                    ${a.price}
                  </span>

                  {/* Tooltip */}
                  <div
                    className="absolute bottom-full mb-3 px-3 py-2 rounded-lg text-[10px] hidden group-hover:block whitespace-nowrap z-10 pointer-events-none"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                  >
                    <div style={{ fontFamily: "'SF Mono', monospace" }}>
                      <span style={{ color: 'var(--text-muted)' }}>Rev</span> {fmt(a.revenue)}
                      <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>|</span>
                      <span style={{ color: 'var(--text-muted)' }}>Profit</span>{' '}
                      <span style={{ color: a.profit > 0 ? 'var(--accent)' : 'var(--red)' }}>{fmt(a.profit)}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>|</span>
                      <span style={{ color: 'var(--text-muted)' }}>Vol</span> {a.volume.toLocaleString()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-4 justify-center">
            {[
              { label: 'Revenue', color: 'rgba(255,255,255,0.12)' },
              { label: 'Profit', color: 'rgba(255,255,255,0.06)' },
              { label: 'Current', color: 'var(--blue)' },
              { label: 'Optimal', color: 'var(--accent)' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Price point table */}
        <div className="sim-card">
          <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
            Price Point Analysis
          </div>

          <table className="w-full text-xs" style={{ fontFamily: "'SF Mono', monospace" }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="text-left py-2.5 text-[10px] uppercase tracking-widest font-medium">Price</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-widest font-medium">Volume</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-widest font-medium">Revenue</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-widest font-medium">Cost</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-widest font-medium">Profit</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-widest font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {analysis.map((a) => {
                const isCurrent = a.price === data.currentPrice
                const isOptimal = a.price === optimal.price

                return (
                  <tr
                    key={a.price}
                    className="transition-colors"
                    style={{
                      borderTop: '1px solid var(--border)',
                      background: isOptimal
                        ? 'var(--accent-soft)'
                        : isCurrent
                        ? 'var(--blue-soft)'
                        : 'transparent',
                    }}
                  >
                    <td className="py-2.5" style={{ color: isOptimal ? 'var(--accent)' : isCurrent ? 'var(--blue)' : 'var(--text)' }}>
                      ${a.price}
                      {isOptimal && <span className="ml-2 text-[9px] opacity-60">BEST</span>}
                      {isCurrent && <span className="ml-2 text-[9px] opacity-60">NOW</span>}
                    </td>
                    <td className="py-2.5 text-right" style={{ color: 'var(--text-secondary)' }}>{a.volume.toLocaleString()}</td>
                    <td className="py-2.5 text-right" style={{ color: 'var(--text)' }}>{fmt(a.revenue)}</td>
                    <td className="py-2.5 text-right" style={{ color: 'var(--red)', opacity: 0.7 }}>{fmt(a.cost)}</td>
                    <td className="py-2.5 text-right" style={{ color: a.profit > 0 ? 'var(--accent)' : 'var(--red)' }}>
                      {fmt(a.profit)}
                    </td>
                    <td className="py-2.5 text-right" style={{ color: 'var(--text-secondary)' }}>{a.margin.toFixed(0)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
