'use client'

import { useState, useCallback, useMemo } from 'react'
import { Upload, Plus, X, Zap, Lightbulb, TrendingDown, Eye, MousePointerClick, Shield, MessageSquare, ArrowRightLeft, Merge, Info } from 'lucide-react'

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
    return { id: genId(), name: cells[0] || 'Step', submissions: parseInt(cells[1], 10) || 0 }
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

  const worstStep = analysis.reduce((worst, s) =>
    s.dropOffPct > worst.dropOffPct ? s : worst
  , analysis[0])

  const updateStep = useCallback((id: string, field: 'name' | 'submissions', value: string | number) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }, [])

  const addStep = useCallback(() => {
    const last = steps[steps.length - 1]
    setSteps((prev) => [...prev, { id: genId(), name: 'New Step', submissions: Math.round((last?.submissions || 100) * 0.7) }])
  }, [steps])

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => {
      if (prev.length <= 1) return prev
      const idx = prev.findIndex((s) => s.id === id)
      if (idx === -1) return prev
      const without = prev.filter((s) => s.id !== id)
      return without.map((step, i) => {
        if (i <= idx - 1 || idx === 0 && i === 0) return step
        const prevInOriginal = prev[prev.indexOf(step) - 1]
        const prevInNew = without[i - 1]
        if (!prevInOriginal || !prevInNew) return step
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
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Form Step Analyzer</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Enter your form steps and submission counts. See exactly where people drop off.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors"
            style={{ background: 'var(--bg-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            <Upload className="w-3.5 h-3.5" />
            {fileName || 'Import CSV'}
            <input type="file" accept=".csv" onChange={handleCSV} className="hidden" />
          </label>
          <button
            onClick={addStep}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ background: 'var(--bg-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Step
          </button>
          <button
            onClick={() => setShowOptimize(!showOptimize)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{
              background: showOptimize ? 'var(--accent)' : 'var(--bg-alt)',
              color: showOptimize ? '#fff' : 'var(--text-secondary)',
              border: showOptimize ? '1px solid var(--accent)' : '1px solid var(--border)',
            }}
          >
            <Zap className="w-3.5 h-3.5" />
            Optimize
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-8 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Total Started</div>
          <input
            type="number"
            value={totalEntries}
            onChange={(e) => {
              const newTotal = parseInt(e.target.value) || 0
              if (totalEntries === 0) return
              const ratio = newTotal / totalEntries
              setSteps((prev) => prev.map((s) => ({ ...s, submissions: Math.round(s.submissions * ratio) })))
            }}
            className="text-2xl font-bold bg-transparent outline-none w-28 sim-inline-input"
            style={{ fontFamily: "'SF Mono', monospace", color: 'var(--text)' }}
          />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Completed</div>
          <input
            type="number"
            value={totalCompletions}
            onChange={(e) => {
              const newComp = parseInt(e.target.value) || 0
              setSteps((prev) => prev.map((s, i) => i === prev.length - 1 ? { ...s, submissions: newComp } : s))
            }}
            className="text-2xl font-bold bg-transparent outline-none w-28 sim-inline-input"
            style={{ fontFamily: "'SF Mono', monospace", color: 'var(--accent)' }}
          />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Completion Rate</div>
          <div className="text-2xl font-bold" style={{ fontFamily: "'SF Mono', monospace", color: 'var(--text-secondary)' }}>
            {overallConversion.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Worst Drop-off</div>
          <div className="text-2xl font-bold" style={{ fontFamily: "'SF Mono', monospace", color: 'var(--text)' }}>
            {worstStep?.name || '--'}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="sim-card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="text-left text-[10px] uppercase tracking-widest font-medium px-4 py-3 w-8" style={{ color: 'var(--text-muted)' }}>#</th>
              <th className="text-left text-[10px] uppercase tracking-widest font-medium px-4 py-3" style={{ color: 'var(--text-muted)' }}>Step</th>
              <th className="text-right text-[10px] uppercase tracking-widest font-medium px-4 py-3 w-28" style={{ color: 'var(--text-muted)' }}>Submissions</th>
              <th className="text-right text-[10px] uppercase tracking-widest font-medium px-4 py-3 w-24" style={{ color: 'var(--text-muted)' }}>Drop-offs</th>
              <th className="text-right text-[10px] uppercase tracking-widest font-medium px-4 py-3 w-24" style={{ color: 'var(--text-muted)' }}>Drop %</th>
              <th className="text-right text-[10px] uppercase tracking-widest font-medium px-4 py-3 w-24" style={{ color: 'var(--text-muted)' }}>of Total</th>
              <th className="text-center text-[10px] uppercase tracking-widest font-medium px-4 py-3 w-32" style={{ color: 'var(--text-muted)' }}>Funnel</th>
              <th className="px-2 py-3 w-8" />
            </tr>
          </thead>
          <tbody style={{ fontFamily: "'SF Mono', monospace" }}>
            {analysis.map((row, i) => {
              const barWidth = maxSubmissions > 0 ? (row.submissions / maxSubmissions) * 100 : 0

              return (
                <tr
                  key={row.id}
                  style={{ borderBottom: '1px solid var(--border)' }}
                  className="transition-colors"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <input
                      value={row.name}
                      onChange={(e) => updateStep(row.id, 'name', e.target.value)}
                      className="text-xs bg-transparent outline-none w-full sim-inline-input"
                      style={{ color: 'var(--text)', fontFamily: '-apple-system, sans-serif' }}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <input
                      type="number"
                      value={row.submissions}
                      onChange={(e) => updateStep(row.id, 'submissions', parseInt(e.target.value) || 0)}
                      className="text-xs bg-transparent outline-none w-full text-right sim-inline-input"
                      style={{ color: 'var(--text)' }}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {i > 0 ? (
                      <input
                        type="number"
                        value={row.dropOff}
                        onChange={(e) => {
                          const newDropOff = parseInt(e.target.value) || 0
                          const prev = steps[i - 1].submissions
                          updateStep(row.id, 'submissions', Math.max(0, prev - newDropOff))
                        }}
                        className="text-xs bg-transparent outline-none w-full text-right sim-inline-input"
                        style={{ color: 'var(--text-secondary)' }}
                      />
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>--</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {i > 0 ? (
                      <span className="text-xs" style={{ color: row.dropOffPct > 30 ? 'var(--text)' : 'var(--text-secondary)' }}>
                        {row.dropOffPct.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>--</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{row.pctOfTotal.toFixed(1)}%</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${barWidth}%`, background: 'var(--accent)' }}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      onClick={() => removeStep(row.id)}
                      className="w-5 h-5 flex items-center justify-center rounded opacity-30 hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-muted)' }}
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

        const removalImpact = badSteps.map((step) => {
          let simulated = totalEntries
          for (let i = 1; i < analysis.length; i++) {
            if (analysis[i].id === step.id) continue
            const prevSubs = i > 0 ? analysis[i - 1].submissions : totalEntries
            const rate = prevSubs > 0 ? analysis[i].submissions / prevSubs : 1
            simulated = Math.round(simulated * rate)
          }
          return { ...step, projectedCompletions: simulated, gain: simulated - totalCompletions }
        })

        const stepCount = steps.length
        const isEarly = (idx: number) => idx <= Math.ceil(stepCount * 0.3)
        const isLate = (idx: number) => idx > Math.ceil(stepCount * 0.7)

        type Rec = { icon: typeof Zap; title: string; detail: string; impact: string; impactNum: number }
        const recommendations: Rec[] = []

        for (const step of badSteps) {
          const idx = analysis.indexOf(step)
          const impact = removalImpact.find((r) => r.id === step.id)
          const gainStr = `+${(impact?.gain || 0).toLocaleString()} completions`

          if (idx === 1 && step.dropOffPct > 40) {
            recommendations.push({
              icon: Eye, title: `"${step.name}" kills ${step.dropOffPct.toFixed(0)}% before they start`,
              detail: `First field loses ${step.dropOff.toLocaleString()} people. Show value prop above the field, use single-field start, or add a progress bar starting at 20%.`,
              impact: gainStr, impactNum: impact?.gain || 0,
            })
          }

          if (step.name.toLowerCase().includes('phone') && step.dropOffPct > 20) {
            recommendations.push({
              icon: Shield, title: `Phone drops ${step.dropOffPct.toFixed(0)}% of leads`,
              detail: `Make it optional with "(optional)" label, move to follow-up email, or add "We'll only call if you request it" under the field.`,
              impact: gainStr, impactNum: impact?.gain || 0,
            })
          }

          if ((step.name.toLowerCase().includes('budget') || step.name.toLowerCase().includes('price') || step.name.toLowerCase().includes('revenue')) && step.dropOffPct > 15) {
            recommendations.push({
              icon: ArrowRightLeft, title: `"${step.name}" scares off ${step.dropOff.toLocaleString()} people`,
              detail: `Use ranges instead of exact numbers. Reframe as "growth goal" instead of "budget". Move to last step before submit.`,
              impact: gainStr, impactNum: impact?.gain || 0,
            })
          }

          if ((step.name.toLowerCase().includes('company') || step.name.toLowerCase().includes('business')) && step.dropOffPct > 15) {
            recommendations.push({
              icon: Merge, title: `Combine "${step.name}" with name/email step`,
              detail: `Three fields on one line feels like one step. Eliminates the page transition causing ${step.dropOff.toLocaleString()} drop-offs.`,
              impact: gainStr, impactNum: impact?.gain || 0,
            })
          }

          if (isLate(idx) && step.dropOffPct > 15) {
            recommendations.push({
              icon: MousePointerClick, title: `${step.dropOff.toLocaleString()} quit at "${step.name}" -- nearly done`,
              detail: `Add progress indicator showing "Almost done!". Auto-save data so they can return. Add character minimum instead of open-ended.`,
              impact: gainStr, impactNum: impact?.gain || 0,
            })
          }

          if (idx === 1 && stepCount > 5 && !recommendations.some((r) => r.title.includes('steps'))) {
            recommendations.push({
              icon: Merge, title: `${stepCount} steps is a lot`,
              detail: `Group related fields: Personal info on step 1, project details on step 2, submit on step 3. Fewer pages = less psychological weight.`,
              impact: 'Potential 15-30% lift', impactNum: 0,
            })
          }

          if (step.dropOffPct > 25 && !recommendations.some((r) => r.title.includes(step.name))) {
            recommendations.push({
              icon: MessageSquare, title: `"${step.name}" has ${step.dropOffPct.toFixed(0)}% drop-off`,
              detail: `Is this needed now or could you collect it later? Can it be a dropdown instead of free text? Adding "Why we ask" reduces abandonment 10-20%.`,
              impact: gainStr, impactNum: impact?.gain || 0,
            })
          }
        }

        recommendations.sort((a, b) => b.impactNum - a.impactNum)

        const formGrade = overallConversion > 30 ? 'A' : overallConversion > 20 ? 'B' : overallConversion > 10 ? 'C' : overallConversion > 5 ? 'D' : 'F'

        return (
          <div className="sim-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Optimization Report</span>
                  <span className="text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>
                    {totalLost.toLocaleString()} lost across {badSteps.length} problem steps
                  </span>
                </div>
              </div>
              <div
                className="px-2.5 py-1 rounded-md text-xs font-bold"
                style={{ fontFamily: "'SF Mono', monospace", background: 'var(--bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                {formGrade}
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-6 mb-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Total Lost</div>
                <div className="text-lg font-bold" style={{ fontFamily: "'SF Mono', monospace", color: 'var(--text)' }}>
                  {totalLost.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Top Fix Impact</div>
                <div className="text-lg font-bold" style={{ fontFamily: "'SF Mono', monospace", color: 'var(--accent)' }}>
                  +{(removalImpact[0]?.gain || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Projected Rate</div>
                <div className="text-lg font-bold" style={{ fontFamily: "'SF Mono', monospace", color: 'var(--text-secondary)' }}>
                  {totalEntries > 0 ? (((totalCompletions + (removalImpact[0]?.gain || 0)) / totalEntries) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-3 py-3 rounded-lg"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                >
                  <rec.icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>{rec.title}</div>
                    <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{rec.detail}</div>
                  </div>
                  <div className="text-[10px] font-medium flex-shrink-0" style={{ fontFamily: "'SF Mono', monospace", color: 'var(--accent)' }}>
                    {rec.impact}
                  </div>
                </div>
              ))}

              {recommendations.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No major optimization opportunities at current drop-off rates.</p>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
