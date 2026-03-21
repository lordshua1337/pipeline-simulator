'use client'

import { useState, useCallback, useMemo } from 'react'
import { Upload, Plus, X, AlertTriangle, TrendingDown, Lightbulb, Zap, Trash2, Merge, ArrowRightLeft, Eye, MousePointerClick, Shield, MessageSquare } from 'lucide-react'

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
  const [showOptimize, setShowOptimize] = useState(false)

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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Step
          </button>
          <button
            onClick={() => setShowOptimize(!showOptimize)}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              showOptimize
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Optimize
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

      {/* Optimization panel */}
      {showOptimize && (() => {
        const badSteps = analysis.filter((s) => s.dropOffPct > 10).sort((a, b) => b.dropOff - a.dropOff)
        const totalLost = totalEntries - totalCompletions
        const stepCount = steps.length

        // Simulate removing each bad step and calculate impact
        const removalImpact = badSteps.map((step) => {
          const idx = analysis.indexOf(step)
          // Calculate what completion would be without this step
          let simulated = totalEntries
          for (let i = 1; i < analysis.length; i++) {
            if (analysis[i].id === step.id) continue
            const prevSubs = i > 0 ? analysis[i - 1].submissions : totalEntries
            const rate = prevSubs > 0 ? analysis[i].submissions / prevSubs : 1
            simulated = Math.round(simulated * rate)
          }
          return { ...step, projectedCompletions: simulated, gain: simulated - totalCompletions }
        })

        // Categorize steps by position for smart recommendations
        const isEarly = (idx: number) => idx <= Math.ceil(stepCount * 0.3)
        const isMid = (idx: number) => idx > Math.ceil(stepCount * 0.3) && idx <= Math.ceil(stepCount * 0.7)
        const isLate = (idx: number) => idx > Math.ceil(stepCount * 0.7)

        // Generate specific tactical recommendations
        type Rec = { icon: typeof Zap; title: string; detail: string; impact: string; priority: 'critical' | 'high' | 'medium'; impactNum: number }
        const recommendations: Rec[] = []

        for (const step of badSteps) {
          const idx = analysis.indexOf(step)
          const impact = removalImpact.find((r) => r.id === step.id)
          const gainStr = `+${(impact?.gain || 0).toLocaleString()} completions`
          const pctGain = totalCompletions > 0 ? (((impact?.gain || 0) / totalCompletions) * 100).toFixed(0) : '0'

          // First step with huge drop-off = friction before they even start
          if (idx === 1 && step.dropOffPct > 40) {
            recommendations.push({
              icon: Eye,
              title: `"${step.name}" kills ${step.dropOffPct.toFixed(0)}% before they even start`,
              detail: `Your very first form field loses ${step.dropOff.toLocaleString()} people. This is the highest-leverage fix on the entire form. Try: show the value prop ABOVE the first field, use a single-field start (just email), or use a progress bar that starts at 20% to create momentum.`,
              impact: `${gainStr} (+${pctGain}% completions)`,
              priority: 'critical',
              impactNum: impact?.gain || 0,
            })
          }

          // Phone number pattern (common killer)
          if (step.name.toLowerCase().includes('phone') && step.dropOffPct > 20) {
            recommendations.push({
              icon: Shield,
              title: `Phone number request drops ${step.dropOffPct.toFixed(0)}% of leads`,
              detail: `Phone fields are the #1 form killer across all industries. Three options: (1) Make it optional with "(optional)" label -- this alone recovers 30-50% of drop-offs. (2) Move it to a follow-up email after submission. (3) Add "We'll only call if you request it" trust copy directly under the field.`,
              impact: `${gainStr} (+${pctGain}% completions)`,
              priority: step.dropOffPct > 35 ? 'critical' : 'high',
              impactNum: impact?.gain || 0,
            })
          }

          // Budget/price/money pattern
          if ((step.name.toLowerCase().includes('budget') || step.name.toLowerCase().includes('price') || step.name.toLowerCase().includes('revenue')) && step.dropOffPct > 15) {
            recommendations.push({
              icon: ArrowRightLeft,
              title: `"${step.name}" scares off ${step.dropOff.toLocaleString()} people`,
              detail: `Money questions trigger commitment anxiety. Fix: use ranges instead of exact numbers (dropdown with "$1K-5K", "$5K-10K" etc), or reframe as "What's your growth goal?" instead of "What's your budget?". Moving this to the last step before submit also helps -- by then they're invested.`,
              impact: `${gainStr} (+${pctGain}% completions)`,
              priority: 'high',
              impactNum: impact?.gain || 0,
            })
          }

          // Company/business info pattern
          if ((step.name.toLowerCase().includes('company') || step.name.toLowerCase().includes('business') || step.name.toLowerCase().includes('organization')) && step.dropOffPct > 15) {
            recommendations.push({
              icon: Merge,
              title: `Combine "${step.name}" with the name/email step`,
              detail: `Company info feels like a separate form. Merge it into the first step as a single row: [Name] [Email] [Company]. Three fields on one line feels like one step, not three. This eliminates the page transition that causes ${step.dropOff.toLocaleString()} drop-offs.`,
              impact: `${gainStr} (+${pctGain}% completions)`,
              priority: 'high',
              impactNum: impact?.gain || 0,
            })
          }

          // Late-stage drop-off (they were almost done)
          if (isLate(idx) && step.dropOffPct > 15) {
            recommendations.push({
              icon: MousePointerClick,
              title: `${step.dropOff.toLocaleString()} people quit at "${step.name}" -- they were ${((1 - idx / stepCount) * 100).toFixed(0)}% done`,
              detail: `Late-stage abandonment is the most expensive kind -- these leads were highly engaged. Add a progress indicator showing "Almost done! Step ${idx} of ${stepCount}". Consider auto-saving their data so they can return later. If this step has a text area, add a character minimum indicator instead of leaving it open-ended.`,
              impact: `${gainStr} (+${pctGain}% completions)`,
              priority: 'critical',
              impactNum: impact?.gain || 0,
            })
          }

          // Multi-step form with too many steps
          if (idx === 1 && stepCount > 5) {
            recommendations.push({
              icon: Merge,
              title: `${stepCount} steps is a lot -- consider a 2-3 step multi-page form`,
              detail: `Forms with 5+ steps lose 20-40% more than 2-3 step forms. Group related fields together: Personal info (name + email + phone) on step 1, Project details on step 2, Submit on step 3. Each "page" can have multiple fields without the psychological weight of ${stepCount} separate steps.`,
              impact: `Potential 15-30% lift in overall completion`,
              priority: 'medium',
              impactNum: 0,
            })
          }

          // Generic high drop-off that didn't match specific patterns
          if (step.dropOffPct > 25 && !recommendations.some((r) => r.title.includes(step.name))) {
            recommendations.push({
              icon: MessageSquare,
              title: `"${step.name}" has a ${step.dropOffPct.toFixed(0)}% drop-off (${step.dropOff.toLocaleString()} lost)`,
              detail: `This field is losing significant traffic. Evaluate: Is this information actually needed at this stage, or could you collect it later? Can it be a dropdown/select instead of free text? Can you pre-fill it from earlier answers? Adding helper text ("Why we ask this") reduces abandonment by 10-20%.`,
              impact: `${gainStr} (+${pctGain}% completions)`,
              priority: step.dropOffPct > 40 ? 'critical' : 'high',
              impactNum: impact?.gain || 0,
            })
          }
        }

        // Sort by impact
        const priorityOrder = { critical: 0, high: 1, medium: 2 }
        recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.impactNum - a.impactNum)

        // Overall form health
        const formGrade = overallConversion > 30 ? 'A' : overallConversion > 20 ? 'B' : overallConversion > 10 ? 'C' : overallConversion > 5 ? 'D' : 'F'
        const gradeColor = { A: 'text-green-600 bg-green-50', B: 'text-blue-600 bg-blue-50', C: 'text-amber-600 bg-amber-50', D: 'text-orange-600 bg-orange-50', F: 'text-red-600 bg-red-50' }[formGrade]

        return (
          <div className="border border-blue-200 rounded-xl overflow-hidden bg-blue-50/20">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-blue-100">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Optimization Report</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {totalLost.toLocaleString()} people lost across {badSteps.length} problem step{badSteps.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${gradeColor}`}>
                Grade: {formGrade}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-blue-100 bg-white/50">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total Lost</div>
                <div className="text-lg font-bold text-red-500">{totalLost.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">If Top Fix Applied</div>
                <div className="text-lg font-bold text-green-600">
                  +{(removalImpact[0]?.gain || 0).toLocaleString()} leads
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Projected Rate</div>
                <div className="text-lg font-bold text-blue-600">
                  {totalEntries > 0 ? (((totalCompletions + (removalImpact[0]?.gain || 0)) / totalEntries) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="p-5 space-y-3">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-4 border ${
                    rec.priority === 'critical'
                      ? 'bg-red-50/50 border-red-200'
                      : rec.priority === 'high'
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      rec.priority === 'critical' ? 'bg-red-100' : rec.priority === 'high' ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      <rec.icon className={`w-4 h-4 ${
                        rec.priority === 'critical' ? 'text-red-600' : rec.priority === 'high' ? 'text-amber-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          rec.priority === 'critical' ? 'bg-red-100 text-red-700'
                            : rec.priority === 'high' ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">{rec.title}</div>
                      <div className="text-xs text-gray-600 leading-relaxed">{rec.detail}</div>
                      <div className="mt-2 text-xs font-mono font-medium text-green-600">{rec.impact}</div>
                    </div>
                  </div>
                </div>
              ))}

              {recommendations.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-2xl mb-2">&#10003;</div>
                  <p className="text-sm font-medium text-gray-900">Your form is performing well</p>
                  <p className="text-xs text-gray-500 mt-1">No major optimization opportunities detected at current drop-off rates.</p>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
