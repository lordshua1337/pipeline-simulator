'use client'

import { useState, useMemo, useCallback } from 'react'
import { Sliders, TrendingUp, TrendingDown, Minus, RotateCcw } from 'lucide-react'
import type { Stage, Item, StageHistory } from '@/lib/types'

interface SensitivitySlidersProps {
  readonly stages: readonly Stage[]
  readonly items: readonly Item[]
  readonly history: readonly StageHistory[]
}

interface StageRate {
  readonly stageId: string
  readonly stageName: string
  readonly baseRate: number
  readonly currentRate: number
  readonly color: string
}

function estimateBaseRate(
  stage: Stage,
  items: readonly Item[],
  history: readonly StageHistory[]
): number {
  const stageTransitions = history.filter(h => h.fromStageId === stage.id)
  const stageEntries = history.filter(h => h.toStageId === stage.id)

  if (stageEntries.length > 0) {
    return Math.min(1, stageTransitions.length / stageEntries.length)
  }

  // Fallback: estimate from item distribution
  const stageItems = items.filter(i => i.stageId === stage.id)
  const totalItems = items.length
  if (totalItems > 0 && stageItems.length > 0) {
    return Math.max(0.3, 1 - stageItems.length / totalItems)
  }

  return 0.7
}

function simulateThroughput(
  startingItems: number,
  rates: readonly number[]
): number {
  let remaining = startingItems
  for (const rate of rates) {
    remaining = Math.round(remaining * rate)
  }
  return remaining
}

export default function SensitivitySliders({
  stages,
  items,
  history,
}: SensitivitySlidersProps) {
  const baseRates = useMemo(() => {
    return stages.map(stage => ({
      stageId: stage.id,
      stageName: stage.name,
      baseRate: estimateBaseRate(stage, items, history),
      currentRate: estimateBaseRate(stage, items, history),
      color: stage.color,
    }))
  }, [stages, items, history])

  const [rates, setRates] = useState<readonly StageRate[]>(baseRates)
  const startingItems = Math.max(100, items.length)

  const updateRate = useCallback((stageId: string, newRate: number) => {
    setRates(prev => prev.map(r =>
      r.stageId === stageId ? { ...r, currentRate: newRate } : r
    ))
  }, [])

  const resetAll = useCallback(() => {
    setRates(baseRates)
  }, [baseRates])

  const baseThroughput = useMemo(
    () => simulateThroughput(startingItems, rates.map(r => r.baseRate)),
    [startingItems, rates]
  )

  const currentThroughput = useMemo(
    () => simulateThroughput(startingItems, rates.map(r => r.currentRate)),
    [startingItems, rates]
  )

  const throughputDelta = currentThroughput - baseThroughput
  const throughputPct = baseThroughput > 0
    ? Math.round((throughputDelta / baseThroughput) * 100)
    : 0

  // Per-stage impact: what happens if ONLY this stage changes
  const stageImpacts = useMemo(() => {
    return rates.map((rate, idx) => {
      const baseRatesArr = rates.map(r => r.baseRate)
      const modifiedRates = [...baseRatesArr]
      modifiedRates[idx] = rate.currentRate
      const modifiedThroughput = simulateThroughput(startingItems, modifiedRates)
      return modifiedThroughput - baseThroughput
    })
  }, [rates, startingItems, baseThroughput])

  // Waterfall: items remaining after each stage
  const waterfall = useMemo(() => {
    const result: number[] = [startingItems]
    let remaining = startingItems
    for (const rate of rates) {
      remaining = Math.round(remaining * rate.currentRate)
      result.push(remaining)
    }
    return result
  }, [startingItems, rates])

  const maxWaterfall = startingItems

  return (
    <div
      className="p-6 rounded-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sliders size={18} style={{ color: 'var(--purple)' }} />
          <h3 className="text-lg font-bold">Sensitivity Analysis</h3>
        </div>
        <button
          onClick={resetAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      {/* Throughput summary */}
      <div
        className="grid grid-cols-3 gap-4 p-4 rounded-xl mb-6"
        style={{ background: 'var(--bg)' }}
      >
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Baseline Output</p>
          <p className="text-xl font-black">{baseThroughput}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>of {startingItems} input</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Current Output</p>
          <p className="text-xl font-black" style={{ color: 'var(--purple)' }}>
            {currentThroughput}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Impact</p>
          <div className="flex items-center gap-1">
            {throughputDelta > 0 ? (
              <TrendingUp size={16} style={{ color: 'var(--green)' }} />
            ) : throughputDelta < 0 ? (
              <TrendingDown size={16} style={{ color: 'var(--red)' }} />
            ) : (
              <Minus size={16} style={{ color: 'var(--text-muted)' }} />
            )}
            <p
              className="text-xl font-black"
              style={{
                color: throughputDelta > 0 ? 'var(--green)' : throughputDelta < 0 ? 'var(--red)' : 'var(--text-muted)',
              }}
            >
              {throughputDelta > 0 ? '+' : ''}{throughputPct}%
            </p>
          </div>
        </div>
      </div>

      {/* Stage sliders */}
      <div className="space-y-5">
        {rates.map((rate, idx) => {
          const delta = rate.currentRate - rate.baseRate
          const impact = stageImpacts[idx]

          return (
            <div key={rate.stageId}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: rate.color }}
                  />
                  <span className="text-sm font-medium">{rate.stageName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    base: {Math.round(rate.baseRate * 100)}%
                  </span>
                  <span
                    className="text-sm font-bold font-mono w-12 text-right"
                    style={{
                      color: delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--text)',
                    }}
                  >
                    {Math.round(rate.currentRate * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(rate.currentRate * 100)}
                  onChange={(e) => updateRate(rate.stageId, parseInt(e.target.value) / 100)}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${rate.color} 0%, ${rate.color} ${rate.currentRate * 100}%, var(--bg) ${rate.currentRate * 100}%, var(--bg) 100%)`,
                    accentColor: rate.color,
                  }}
                />
                {impact !== 0 && (
                  <span
                    className="text-[10px] font-bold w-16 text-right"
                    style={{ color: impact > 0 ? 'var(--green)' : 'var(--red)' }}
                  >
                    {impact > 0 ? '+' : ''}{impact} items
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Waterfall visualization */}
      <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
        <h4 className="text-sm font-bold mb-3">Pipeline Waterfall</h4>
        <div className="flex items-end gap-1" style={{ height: 80 }}>
          {waterfall.map((count, idx) => {
            const height = maxWaterfall > 0 ? (count / maxWaterfall) * 100 : 0
            const isStage = idx > 0
            const stageColor = isStage ? rates[idx - 1]?.color : 'var(--blue)'
            const label = idx === 0 ? 'Input' : rates[idx - 1]?.stageName ?? ''

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end"
              >
                <span className="text-[10px] font-bold mb-1">{count}</span>
                <div
                  className="w-full rounded-t transition-all duration-200"
                  style={{
                    height: `${Math.max(4, height)}%`,
                    background: stageColor,
                    opacity: 0.7,
                  }}
                />
                <span
                  className="text-[8px] mt-1 truncate w-full text-center"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
