'use client'

import { useMemo } from 'react'
import type { ABTestData } from '@/lib/workspace-types'
import { normalRandom, calculateMean, calculateStdDev, calculatePercentile } from '@/lib/utils/statistics'
import { BarChart3, Trophy, Clock, Target } from 'lucide-react'

interface ABTestSimProps {
  data: ABTestData
  onChange: (data: ABTestData) => void
}

function zTest(pA: number, pB: number, nA: number, nB: number) {
  const pPool = (pA * nA + pB * nB) / (nA + nB)
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB))
  if (se === 0) return { z: 0, pValue: 1, significant: false }
  const z = (pB - pA) / se
  const pValue = 2 * (1 - normalCDF(Math.abs(z)))
  return { z, pValue, significant: pValue < 0.05 }
}

function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return 0.5 * (1.0 + sign * y)
}

function sampleSizeNeeded(baseline: number, mde: number, power: number = 0.8, alpha: number = 0.05): number {
  const zAlpha = 1.96
  const zBeta = 0.84
  const p1 = baseline
  const p2 = baseline + mde
  const pBar = (p1 + p2) / 2
  const n = (2 * pBar * (1 - pBar) * (zAlpha + zBeta) ** 2) / mde ** 2
  return Math.ceil(n)
}

export function ABTestSim({ data, onChange }: ABTestSimProps) {
  const results = useMemo(() => {
    const { variantA: a, variantB: b, dailyTraffic, trafficSplit } = data
    const test = zTest(a.conversionRate, b.conversionRate, a.traffic, b.traffic)

    const lift = a.conversionRate > 0
      ? ((b.conversionRate - a.conversionRate) / a.conversionRate) * 100
      : 0

    const revenueA = a.traffic * a.conversionRate * a.revenuePerConversion
    const revenueB = b.traffic * b.conversionRate * b.revenuePerConversion
    const revenueLift = revenueB - revenueA

    const mde = Math.abs(b.conversionRate - a.conversionRate)
    const needed = mde > 0 ? sampleSizeNeeded(a.conversionRate, mde) : Infinity
    const dailyPerVariant = dailyTraffic * (trafficSplit / 100)
    const daysToSig = dailyPerVariant > 0 ? Math.ceil(needed / dailyPerVariant) : Infinity

    // Monte Carlo: probability B wins
    const mcIterations = 5000
    let bWins = 0
    const profitDist: number[] = []
    for (let i = 0; i < mcIterations; i++) {
      const convA = Math.max(0.001, normalRandom(a.conversionRate, a.conversionRate * 0.15))
      const convB = Math.max(0.001, normalRandom(b.conversionRate, b.conversionRate * 0.15))
      if (convB > convA) bWins++
      profitDist.push((convB - convA) * b.traffic * b.revenuePerConversion)
    }
    const probBWins = (bWins / mcIterations) * 100
    const sorted = [...profitDist].sort((x, y) => x - y)

    return {
      ...test,
      lift,
      revenueA,
      revenueB,
      revenueLift,
      needed,
      daysToSig,
      probBWins,
      profitP5: calculatePercentile(sorted, 5),
      profitP95: calculatePercentile(sorted, 95),
      profitMean: calculateMean(sorted),
    }
  }, [data])

  const updateVariant = (variant: 'variantA' | 'variantB', field: string, value: number) => {
    onChange({ ...data, [variant]: { ...data[variant], [field]: value } })
  }

  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`

  return (
    <div className="h-full overflow-y-auto p-6 max-w-5xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Variant A */}
        {(['variantA', 'variantB'] as const).map((v) => {
          const variant = data[v]
          const isB = v === 'variantB'
          return (
            <div key={v} className={`border rounded-xl p-5 ${isB ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${isB ? 'bg-blue-500' : 'bg-gray-400'}`} />
                <input
                  value={variant.name}
                  onChange={(e) => updateVariant(v, 'name', e.target.value as unknown as number)}
                  className="text-sm font-semibold bg-transparent border-none outline-none text-gray-900"
                />
              </div>
              {[
                { label: 'Traffic', key: 'traffic', step: 100, suffix: '' },
                { label: 'Conversion Rate', key: 'conversionRate', step: 0.001, suffix: '%', pct: true },
                { label: 'Revenue/Conversion', key: 'revenuePerConversion', step: 1, suffix: '$' },
              ].map((field) => (
                <div key={field.key} className="flex items-center justify-between py-2">
                  <span className="text-xs text-gray-600">{field.label}</span>
                  <input
                    type="number"
                    value={field.pct ? (variant[field.key as keyof typeof variant] as number * 100).toFixed(1) : variant[field.key as keyof typeof variant] as number}
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value)
                      if (isNaN(raw)) return
                      updateVariant(v, field.key, field.pct ? raw / 100 : raw)
                    }}
                    step={field.pct ? 0.1 : field.step}
                    className="w-24 px-2 py-1 text-xs font-mono bg-white border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Test Config */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
          <span className="text-xs text-gray-600">Daily Traffic</span>
          <input
            type="number"
            value={data.dailyTraffic}
            onChange={(e) => onChange({ ...data, dailyTraffic: parseInt(e.target.value) || 0 })}
            className="w-24 px-2 py-1 text-xs font-mono bg-white border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
          <span className="text-xs text-gray-600">Traffic Split (% to B)</span>
          <input
            type="number"
            value={data.trafficSplit}
            onChange={(e) => onChange({ ...data, trafficSplit: parseInt(e.target.value) || 50 })}
            min={1} max={99}
            className="w-24 px-2 py-1 text-xs font-mono bg-white border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Conversion Lift', value: `${results.lift >= 0 ? '+' : ''}${results.lift.toFixed(1)}%`, icon: Target, color: results.lift > 0 ? 'text-green-600' : 'text-red-500' },
          { label: 'P(B Wins)', value: `${results.probBWins.toFixed(0)}%`, icon: Trophy, color: results.probBWins > 50 ? 'text-green-600' : 'text-gray-600' },
          { label: 'Significant', value: results.significant ? 'Yes (p<0.05)' : 'Not yet', icon: BarChart3, color: results.significant ? 'text-green-600' : 'text-amber-500' },
          { label: 'Days to Sig', value: results.daysToSig === Infinity ? 'N/A' : `${results.daysToSig}d`, icon: Clock, color: 'text-gray-700' },
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

      {/* Revenue comparison */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Control Revenue</div>
          <div className="text-lg font-bold text-gray-700">{fmt(results.revenueA)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Variant Revenue</div>
          <div className="text-lg font-bold text-blue-600">{fmt(results.revenueB)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Revenue Lift (MC Mean)</div>
          <div className={`text-lg font-bold ${results.profitMean >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {fmt(results.profitMean)}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            Range: {fmt(results.profitP5)} to {fmt(results.profitP95)}
          </div>
        </div>
      </div>
    </div>
  )
}
