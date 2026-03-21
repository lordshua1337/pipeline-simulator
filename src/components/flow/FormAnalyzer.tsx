'use client'

import { useState, useCallback, useMemo } from 'react'
import { Upload, Plus, X, AlertTriangle, TrendingDown, ArrowDown, Lightbulb } from 'lucide-react'

interface FormStep {
  readonly id: string
  readonly name: string
  readonly submissions: number
}

function genId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

const DEFAULT_STEPS: readonly FormStep[] = [
  { id: genId(), name: 'Form Loaded', submissions: 12500 },
  { id: genId(), name: 'Name & Email', submissions: 5800 },
  { id: genId(), name: 'Phone Number', submissions: 3200 },
  { id: genId(), name: 'Company Info', submissions: 2400 },
  { id: genId(), name: 'Budget Range', submissions: 1800 },
  { id: genId(), name: 'Project Details', submissions: 1100 },
  { id: genId(), name: 'Submit', submissions: 850 },
]

function parseCSV(text: string): FormStep[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''))
    return {
      id: genId(),
      name: cells[0] || 'Step',
      submissions: parseInt(cells[1], 10) || 0,
    }
  })
}

export function FormAnalyzer() {
  const [steps, setSteps] = useState<readonly FormStep[]>(DEFAULT_STEPS)
  const [fileName, setFileName] = useState('')

  const analysis = useMemo(() => {
    return steps.map((step, i) => {
      const prev = i > 0 ? steps[i - 1].submissions : step.submissions
      const dropOff = i > 0 ? prev - step.submissions : 0
      const dropOffPct = prev > 0 ? (dropOff / prev) * 100 : 0
      const pctOfTotal = steps[0].submissions > 0 ? (step.submissions / steps[0].submissions) * 100 : 0
      return { ...step, dropOff, dropOffPct, pctOfTotal }
    })
  }, [steps])

  const totalEntries = steps[0]?.submissions || 0
  const totalCompletions = steps[steps.length - 1]?.submissions || 0
  const overallConversion = totalEntries > 0 ? (totalCompletions / totalEntries) * 100 : 0
  const maxSubmissions = Math.max(...steps.map((s) => s.submissions), 1)

  // Find worst drop-off step
  const worstStep = analysis.reduce((worst, s) =>
    s.dropOffPct > worst.dropOffPct ? s : worst
  , analysis[0])

  const updateStep = useCallback((id: string, field: 'name' | 'submissions', value: string | number) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }, [])

  const addStep = useCallback(() => {
    const last = steps[steps.length - 1]
    setSteps((prev) => [
      ...prev,
      { id: genId(), name: 'New Step', submissions: Math.round((last?.submissions || 100) * 0.7) },
    ])
  }, [steps])

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => {
      if (prev.length <= 1) return prev

      const idx = prev.findIndex((s) => s.id === id)
      if (idx === -1) return prev

      // When removing a step, the people who dropped off there now flow through.
      // Recalculate: each remaining step keeps its own conversion rate relative
      // to the step before it, but the removed step's drop-off is eliminated.
      const removed = prev[idx]
      const without = prev.filter((s) => s.id !== id)

      // Recalculate submissions from the removal point forward.
      // The step after the removed one now receives what the step BEFORE
      // the removed one had, multiplied by its own pass-through rate.
      return without.map((step, i) => {
        if (i <= idx - 1 || idx === 0 && i === 0) return step

        // This step originally received X from the removed step (or the step before it).
        // Now it receives from the step before it in the new array.
        const prevInOriginal = prev[prev.indexOf(step) - 1]
        const prevInNew = without[i - 1]

        if (!prevInOriginal || !prevInNew) return step

        // Keep this step's original conversion rate (submissions / what it received)
        const originalReceived = prevInOriginal.submissions
        const ownConvRate = originalReceived > 0 ? step.submissions / originalReceived : 1

        return { ...step, submissions: Math.round(prevInNew.submissions * ownConvRate) }
      })
    })
  }, [])

  const handleCSV = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target?.result as string)
      if (parsed.length >= 2) setSteps(parsed)
    }
    reader.readAsText(file)
  }, [])

  return (
    <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Form Step Analyzer</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Enter your form steps and submission counts. See exactly where people drop off.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            {fileName || 'Import CSV'}
            <input type="file" accept=".csv" onChange={handleCSV} className="hidden" />
          </label>
          <button
            onClick={addStep}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Step
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Total Started</div>
          <input
            type="number"
            value={totalEntries}
            onChange={(e) => {
              const newTotal = parseInt(e.target.value) || 0
              if (totalEntries === 0) return
              const ratio = newTotal / totalEntries
              setSteps((prev) => prev.map((s) => ({ ...s, submissions: Math.round(s.submissions * ratio) })))
            }}
            className="text-lg font-bold text-gray-900 bg-transparent outline-none w-full hover:bg-gray-100 focus:bg-gray-100 rounded px-1 -mx-1"
          />
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Completed</div>
          <input
            type="number"
            value={totalCompletions}
            onChange={(e) => {
              const newComp = parseInt(e.target.value) || 0
              setSteps((prev) => prev.map((s, i) => i === prev.length - 1 ? { ...s, submissions: newComp } : s))
            }}
            className="text-lg font-bold text-green-600 bg-transparent outline-none w-full hover:bg-gray-100 focus:bg-gray-100 rounded px-1 -mx-1"
          />
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Completion Rate</div>
          <div className={`text-lg font-bold ${overallConversion > 20 ? 'text-green-600' : 'text-red-500'}`}>
            {overallConversion.toFixed(1)}%
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Biggest Drop-off</div>
          <div className="text-lg font-bold text-red-500">{worstStep?.name || '--'}</div>
        </div>
      </div>

      {/* Editable table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider px-4 py-2.5 w-8">#</th>
              <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider px-4 py-2.5">Form Step / Question</th>
              <th className="text-right text-[10px] text-gray-500 uppercase tracking-wider px-4 py-2.5 w-32">Submissions</th>
              <th className="text-right text-[10px] text-gray-500 uppercase tracking-wider px-4 py-2.5 w-28">Drop-offs</th>
              <th className="text-right text-[10px] text-gray-500 uppercase tracking-wider px-4 py-2.5 w-28">Drop-off %</th>
              <th className="text-right text-[10px] text-gray-500 uppercase tracking-wider px-4 py-2.5 w-28">% of Total</th>
              <th className="text-center text-[10px] text-gray-500 uppercase tracking-wider px-4 py-2.5 w-32">Funnel</th>
              <th className="px-2 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {analysis.map((row, i) => {
              const barWidth = maxSubmissions > 0 ? (row.submissions / maxSubmissions) * 100 : 0
              const isBad = row.dropOffPct > 30
              const isWorst = row.id === worstStep?.id && i > 0

              return (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 last:border-0 ${isWorst ? 'bg-red-50/50' : 'hover:bg-gray-50/50'}`}
                >
                  <td className="px-4 py-2 text-xs text-gray-400 font-mono">{i + 1}</td>
                  <td className="px-4 py-2">
                    <input
                      value={row.name}
                      onChange={(e) => updateStep(row.id, 'name', e.target.value)}
                      className="text-sm text-gray-900 bg-transparent outline-none w-full hover:bg-gray-50 focus:bg-gray-50 rounded px-1 -mx-1 py-0.5"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={row.submissions}
                      onChange={(e) => updateStep(row.id, 'submissions', parseInt(e.target.value) || 0)}
                      className="text-sm font-mono text-gray-900 bg-transparent outline-none w-full text-right hover:bg-gray-50 focus:bg-gray-50 rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    {i > 0 ? (
                      <input
                        type="number"
                        value={row.dropOff}
                        onChange={(e) => {
                          const newDropOff = parseInt(e.target.value) || 0
                          const prev = steps[i - 1].submissions
                          updateStep(row.id, 'submissions', Math.max(0, prev - newDropOff))
                        }}
                        className="text-sm font-mono text-red-500 bg-transparent outline-none w-full text-right hover:bg-gray-50 focus:bg-gray-50 rounded px-1 py-0.5"
                      />
                    ) : (
                      <span className="text-sm font-mono text-gray-300">--</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {i > 0 ? (
                      <div className="flex items-center justify-end gap-1">
                        {isBad && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                        <span className={`text-sm font-mono font-medium ${isBad ? 'text-red-500' : 'text-gray-600'}`}>
                          {row.dropOffPct.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-mono text-gray-300">--</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="text-sm font-mono text-gray-500">{row.pctOfTotal.toFixed(1)}%</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: row.dropOffPct > 40 ? '#EF4444' : row.dropOffPct > 20 ? '#F59E0B' : '#3B82F6',
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => removeStep(row.id)}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Optimization suggestions */}
      <div className="border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">Optimization Opportunities</h3>
        </div>
        <div className="space-y-3">
          {analysis
            .filter((s) => s.dropOffPct > 15)
            .sort((a, b) => b.dropOff - a.dropOff)
            .map((step) => {
              // What if we cut drop-off in half?
              const currentLost = step.dropOff
              const ifHalved = Math.round(currentLost / 2)
              const additionalCompletions = Math.round(
                ifHalved * (totalCompletions / Math.max(step.submissions, 1))
              )

              return (
                <div key={step.id} className="flex items-start gap-3 bg-gray-50 rounded-lg px-4 py-3">
                  <TrendingDown className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      "{step.name}" loses {step.dropOff.toLocaleString()} people ({step.dropOffPct.toFixed(0)}%)
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      If you cut this drop-off in half, you'd gain ~{additionalCompletions.toLocaleString()} more completions.
                      {step.dropOffPct > 40 && ' Consider making this step optional or combining it with another.'}
                      {step.dropOffPct > 25 && step.dropOffPct <= 40 && ' Try simplifying the fields or adding progress indicators.'}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-mono font-medium text-green-600">+{additionalCompletions}</div>
                    <div className="text-[10px] text-gray-400">potential</div>
                  </div>
                </div>
              )
            })}
          {analysis.filter((s) => s.dropOffPct > 15).length === 0 && (
            <p className="text-sm text-gray-500">No major drop-off points detected. Your form is performing well.</p>
          )}
        </div>
      </div>
    </div>
  )
}
