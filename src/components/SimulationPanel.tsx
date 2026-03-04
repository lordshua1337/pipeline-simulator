'use client'

import { useState, useMemo } from 'react'
import { Play, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react'
import {
  runMonteCarlo,
  runSensitivityAnalysis,
  runForecast,
  checkDataSufficiency,
} from '@/lib/services/simulation'
import type {
  Stage,
  Item,
  StageHistory,
  MonteCarloResult,
  SensitivityResult,
  ForecastResult,
} from '@/lib/types'

interface SimulationPanelProps {
  readonly stages: readonly Stage[]
  readonly items: readonly Item[]
  readonly history: readonly StageHistory[]
}

type SimType = 'monte_carlo' | 'sensitivity' | 'forecast'

export default function SimulationPanel({
  stages,
  items,
  history,
}: SimulationPanelProps) {
  const [simType, setSimType] = useState<SimType>('monte_carlo')
  const [running, setRunning] = useState(false)
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null)
  const [saResult, setSaResult] = useState<readonly SensitivityResult[] | null>(null)
  const [fcResult, setFcResult] = useState<ForecastResult | null>(null)
  const [iterations, setIterations] = useState(1000)
  const [forecastDays, setForecastDays] = useState(30)

  // Manual conversion rate overrides
  const [manualRates, setManualRates] = useState<Record<string, string>>({})
  const [useManualRates, setUseManualRates] = useState(false)

  const sufficiency = useMemo(
    () => checkDataSufficiency(items, history, simType === 'sensitivity' ? 20 : 10),
    [items, history, simType]
  )

  const snapshot = useMemo(() => {
    const itemsByStage: Record<string, Item[]> = {}
    for (const stage of stages) {
      itemsByStage[stage.id] = items.filter((i) => i.stageId === stage.id) as Item[]
    }
    return { stages: stages as Stage[], itemsByStage }
  }, [stages, items])

  const handleRun = () => {
    setRunning(true)

    // Build manual rates if enabled
    const rates = useManualRates
      ? Object.fromEntries(
          Object.entries(manualRates)
            .filter(([, v]) => v !== '')
            .map(([k, v]) => [k, parseFloat(v)])
        )
      : undefined

    // Run async in a timeout to not block UI
    setTimeout(() => {
      if (simType === 'monte_carlo') {
        const result = runMonteCarlo(snapshot, history, {
          iterations,
          manualRates: rates,
        })
        setMcResult(result)
      } else if (simType === 'sensitivity') {
        const result = runSensitivityAnalysis(snapshot, history, {
          iterations: Math.floor(iterations / 2),
          manualRates: rates,
        })
        setSaResult(result)
      } else if (simType === 'forecast') {
        const result = runForecast(snapshot, history, forecastDays)
        setFcResult(result)
      }
      setRunning(false)
    }, 100)
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div
        className="p-6 rounded-xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <h3 className="text-lg font-bold mb-4">Simulation Engine</h3>

        {/* Data Sufficiency Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="text-xs font-bold px-2 py-1 rounded"
            style={{
              background:
                sufficiency.readinessBadge === 'Ready'
                  ? 'var(--green-soft)'
                  : 'var(--amber-soft)',
              color:
                sufficiency.readinessBadge === 'Ready'
                  ? 'var(--green)'
                  : 'var(--amber)',
            }}
          >
            {sufficiency.readinessBadge}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {sufficiency.message}
          </span>
        </div>

        {/* Sim Type Selector */}
        <div className="flex gap-2 mb-4">
          {(
            [
              { key: 'monte_carlo', label: 'Monte Carlo' },
              { key: 'sensitivity', label: 'Sensitivity' },
              { key: 'forecast', label: 'Forecast' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSimType(key)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: simType === key ? 'var(--purple-soft)' : 'var(--bg)',
                color: simType === key ? 'var(--purple)' : 'var(--text-secondary)',
                border: `1px solid ${simType === key ? 'var(--purple)' : 'var(--border)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {simType !== 'forecast' && (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                Iterations
              </label>
              <input
                type="number"
                value={iterations}
                onChange={(e) => setIterations(Math.min(10000, parseInt(e.target.value) || 100))}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                min={100}
                max={10000}
              />
            </div>
          )}
          {simType === 'forecast' && (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                Forecast Days
              </label>
              <input
                type="number"
                value={forecastDays}
                onChange={(e) => setForecastDays(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                min={7}
                max={365}
              />
            </div>
          )}
        </div>

        {/* Manual Conversion Rates */}
        {!sufficiency.hasEnoughData && simType !== 'forecast' && (
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm mb-3">
              <input
                type="checkbox"
                checked={useManualRates}
                onChange={(e) => setUseManualRates(e.target.checked)}
              />
              <span style={{ color: 'var(--text-secondary)' }}>
                Use manual conversion rates
              </span>
            </label>
            {useManualRates && (
              <div className="grid grid-cols-2 gap-3">
                {stages.map((stage) => (
                  <div key={stage.id}>
                    <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>
                      {stage.name} rate (0-1)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={manualRates[stage.name] ?? ''}
                      onChange={(e) =>
                        setManualRates({ ...manualRates, [stage.name]: e.target.value })
                      }
                      placeholder="0.70"
                      className="w-full px-2 py-1.5 rounded text-xs"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:scale-105 disabled:opacity-50"
          style={{ background: 'var(--purple)' }}
        >
          <Play size={14} />
          {running ? 'Running...' : 'Run Simulation'}
        </button>
      </div>

      {/* Monte Carlo Results */}
      {mcResult && simType === 'monte_carlo' && (
        <div
          className="p-6 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} style={{ color: 'var(--purple)' }} />
            Monte Carlo Results
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Mean Throughput</p>
              <p className="text-2xl font-black" style={{ color: 'var(--purple)' }}>
                {mcResult.meanThroughput}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Std Deviation</p>
              <p className="text-2xl font-black">{mcResult.stdDev}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>95% CI</p>
              <p className="text-lg font-bold">
                [{mcResult.confidenceInterval95[0]}, {mcResult.confidenceInterval95[1]}]
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Iterations</p>
              <p className="text-2xl font-black">{mcResult.iterations.toLocaleString()}</p>
            </div>
          </div>

          {/* Percentiles */}
          <h4 className="text-sm font-bold mb-2">Percentile Distribution</h4>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(mcResult.percentiles).map(([key, val]) => (
              <div
                key={key}
                className="p-2 rounded text-center"
                style={{ background: 'var(--bg)' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {key.toUpperCase()}
                </p>
                <p className="text-sm font-bold">{val}</p>
              </div>
            ))}
          </div>

          {useManualRates && (
            <p className="text-xs mt-3" style={{ color: 'var(--amber)' }}>
              Results based on manual conversion rates, not historical data.
            </p>
          )}
        </div>
      )}

      {/* Sensitivity Analysis Results */}
      {saResult && simType === 'sensitivity' && (
        <div
          className="p-6 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={18} style={{ color: 'var(--purple)' }} />
            Sensitivity Analysis
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Which conversion rate has the biggest impact on throughput?
          </p>
          <div className="space-y-2">
            {saResult.map((r) => (
              <div
                key={r.parameter}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: 'var(--bg)' }}
              >
                <span
                  className="text-xs font-black w-6 text-center"
                  style={{ color: 'var(--purple)' }}
                >
                  #{r.rank}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{r.parameter}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-16 h-2 rounded-full overflow-hidden"
                    style={{ background: 'var(--bg-alt)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.abs(r.impactOnThroughput) * 100}%`,
                        background:
                          r.impactOnThroughput > 0
                            ? 'var(--green)'
                            : 'var(--red)',
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold w-12 text-right">
                    {r.impactOnThroughput > 0 ? '+' : ''}
                    {(r.impactOnThroughput * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forecast Results */}
      {fcResult && simType === 'forecast' && (
        <div
          className="p-6 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} style={{ color: 'var(--green)' }} />
            {forecastDays}-Day Forecast
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Estimated Completions
              </p>
              <p className="text-3xl font-black" style={{ color: 'var(--green)' }}>
                {fcResult.estimatedCompletions}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>95% CI</p>
              <p className="text-lg font-bold">
                [{fcResult.confidenceInterval95[0]}, {fcResult.confidenceInterval95[1]}]
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Projected Date
              </p>
              <p className="text-lg font-bold">{fcResult.projectedDate}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
