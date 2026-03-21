'use client'

import { useState, useCallback, useMemo } from 'react'
import { Upload, FileSpreadsheet, TrendingDown, AlertTriangle, BarChart3, X, Download } from 'lucide-react'

interface FormStage {
  readonly name: string
  readonly visitors: number
  readonly dropOff: number
  readonly dropOffPct: number
  readonly conversionPct: number
}

interface FormAnalysis {
  readonly stages: readonly FormStage[]
  readonly totalEntries: number
  readonly totalCompletions: number
  readonly overallConversion: number
  readonly worstStage: string
  readonly projectedImpact: readonly {
    readonly stage: string
    readonly currentConv: number
    readonly improvedConv: number
    readonly additionalLeads: number
  }[]
}

function parseCSV(text: string): string[][] {
  const lines = text.trim().split('\n')
  return lines.map((line) => line.split(',').map((cell) => cell.trim().replace(/^["']|["']$/g, '')))
}

function analyzeFormData(rows: string[][], stageCol: number, countCol: number): FormAnalysis {
  const stages: FormStage[] = []
  let prevCount = 0

  for (let i = 1; i < rows.length; i++) {
    const name = rows[i][stageCol] || `Step ${i}`
    const visitors = parseInt(rows[i][countCol], 10) || 0

    if (i === 1) {
      prevCount = visitors
      stages.push({
        name,
        visitors,
        dropOff: 0,
        dropOffPct: 0,
        conversionPct: 100,
      })
    } else {
      const dropOff = prevCount - visitors
      const dropOffPct = prevCount > 0 ? (dropOff / prevCount) * 100 : 0
      const conversionPct = prevCount > 0 ? (visitors / prevCount) * 100 : 0
      stages.push({ name, visitors, dropOff, dropOffPct, conversionPct })
      prevCount = visitors
    }
  }

  const totalEntries = stages[0]?.visitors || 0
  const totalCompletions = stages[stages.length - 1]?.visitors || 0
  const overallConversion = totalEntries > 0 ? (totalCompletions / totalEntries) * 100 : 0

  // Find worst stage (highest drop-off %)
  const worstStage = stages.reduce((worst, s) =>
    s.dropOffPct > (worst?.dropOffPct || 0) ? s : worst
  , stages[0])

  // Project impact: what if each stage improved by 10%?
  const projectedImpact = stages
    .filter((s) => s.dropOffPct > 5)
    .map((s) => {
      const currentConv = s.conversionPct
      const improvedConv = Math.min(100, currentConv * 1.1)
      const additionalLeads = Math.round(
        totalEntries * ((improvedConv - currentConv) / 100) * (s.visitors / totalEntries)
      )
      return {
        stage: s.name,
        currentConv: Math.round(currentConv),
        improvedConv: Math.round(improvedConv),
        additionalLeads: Math.max(0, additionalLeads),
      }
    })

  return {
    stages,
    totalEntries,
    totalCompletions,
    overallConversion,
    worstStage: worstStage?.name || '',
    projectedImpact,
  }
}

export function FormAnalyzer() {
  const [csvData, setCsvData] = useState<string[][] | null>(null)
  const [analysis, setAnalysis] = useState<FormAnalysis | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [manualStages, setManualStages] = useState<{ name: string; visitors: string }[]>([
    { name: 'Page Load', visitors: '10000' },
    { name: 'Started Form', visitors: '3500' },
    { name: 'Email Entered', visitors: '2800' },
    { name: 'Phone Entered', visitors: '1900' },
    { name: 'Form Submitted', visitors: '1200' },
  ])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const rows = parseCSV(text)
      setCsvData(rows)

      // Auto-detect columns: first text column = stage, first number column = count
      if (rows.length > 1) {
        let stageCol = 0
        let countCol = 1
        for (let c = 0; c < rows[0].length; c++) {
          const val = rows[1][c]
          if (val && !isNaN(parseInt(val, 10)) && countCol === 1) {
            countCol = c
          }
        }
        const result = analyzeFormData(rows, stageCol, countCol)
        setAnalysis(result)
      }
    }
    reader.readAsText(file)
  }, [])

  const handleManualAnalysis = useCallback(() => {
    const rows: string[][] = [['Stage', 'Count']]
    for (const stage of manualStages) {
      rows.push([stage.name, stage.visitors])
    }
    const result = analyzeFormData(rows, 0, 1)
    setAnalysis(result)
    setCsvData(rows)
  }, [manualStages])

  const addManualStage = useCallback(() => {
    setManualStages((prev) => [...prev, { name: `Step ${prev.length + 1}`, visitors: '0' }])
  }, [])

  const updateManualStage = useCallback((index: number, field: 'name' | 'visitors', value: string) => {
    setManualStages((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }, [])

  const removeManualStage = useCallback((index: number) => {
    setManualStages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const maxVisitors = analysis ? Math.max(...analysis.stages.map((s) => s.visitors)) : 0

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Form & Funnel Analyzer</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload a CSV or enter stages manually to model drop-off and test lead impact
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* CSV Upload */}
          <div className="border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Upload CSV</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              CSV with columns: stage name, visitor/lead count. One row per funnel step.
            </p>
            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                {fileName || 'Choose CSV file'}
              </span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Manual Entry */}
          <div className="border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">Manual Entry</h3>
              </div>
              <button
                onClick={addManualStage}
                className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Step
              </button>
            </div>
            <div className="space-y-2 mb-3">
              {manualStages.map((stage, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={stage.name}
                    onChange={(e) => updateManualStage(i, 'name', e.target.value)}
                    className="flex-1 px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="Stage name"
                  />
                  <input
                    value={stage.visitors}
                    onChange={(e) => updateManualStage(i, 'visitors', e.target.value)}
                    type="number"
                    className="w-24 px-2 py-1.5 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="Count"
                  />
                  {manualStages.length > 2 && (
                    <button onClick={() => removeManualStage(i)} className="text-gray-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleManualAnalysis}
              className="w-full px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Analyze
            </button>
          </div>
        </div>

        {/* Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total Entries', value: analysis.totalEntries.toLocaleString(), color: 'text-gray-900' },
                { label: 'Completions', value: analysis.totalCompletions.toLocaleString(), color: 'text-green-600' },
                { label: 'Overall Conv.', value: `${analysis.overallConversion.toFixed(1)}%`, color: 'text-blue-600' },
                { label: 'Worst Drop-off', value: analysis.worstStage, color: 'text-red-500' },
              ].map((card) => (
                <div key={card.label} className="bg-gray-50 rounded-lg p-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{card.label}</div>
                  <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* Waterfall visualization */}
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Drop-off Waterfall</h3>
              <div className="space-y-3">
                {analysis.stages.map((stage, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">{stage.name}</span>
                        {stage.dropOffPct > 30 && (
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-mono text-gray-700">{stage.visitors.toLocaleString()}</span>
                        {i > 0 && (
                          <span className="font-mono text-red-500">
                            <TrendingDown className="w-3 h-3 inline mr-0.5" />
                            {stage.dropOffPct.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-6 bg-gray-100 rounded-md overflow-hidden">
                      <div
                        className="h-full rounded-md transition-all"
                        style={{
                          width: `${maxVisitors > 0 ? (stage.visitors / maxVisitors) * 100 : 0}%`,
                          backgroundColor: stage.dropOffPct > 40 ? '#EF4444' : stage.dropOffPct > 20 ? '#F59E0B' : '#3B82F6',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Impact projections */}
            {analysis.projectedImpact.length > 0 && (
              <div className="border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Impact Projections</h3>
                <p className="text-xs text-gray-500 mb-4">What if each stage improved by 10%?</p>
                <div className="space-y-2">
                  {analysis.projectedImpact.map((impact) => (
                    <div key={impact.stage} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-700">{impact.stage}</span>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="font-mono text-gray-500">{impact.currentConv}%</span>
                        <span className="text-gray-300">&rarr;</span>
                        <span className="font-mono text-green-600">{impact.improvedConv}%</span>
                        <span className="font-mono font-medium text-blue-600">
                          +{impact.additionalLeads} leads
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
