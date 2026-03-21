'use client'

import { useMemo } from 'react'
import type { LeadScoringData, LeadSignal } from '@/lib/workspace-types'
import { Target, Plus, X, Upload, BarChart3 } from 'lucide-react'

interface LeadScoringProps {
  data: LeadScoringData
  onChange: (data: LeadScoringData) => void
}

function generateSampleLeads(signals: readonly LeadSignal[], count: number = 200): Record<string, unknown>[] {
  const leads: Record<string, unknown>[] = []
  for (let i = 0; i < count; i++) {
    const lead: Record<string, unknown> = { id: `lead-${i + 1}` }
    for (const signal of signals) {
      if (signal.type === 'boolean') {
        lead[signal.name] = Math.random() > 0.5
      } else if (signal.type === 'numeric') {
        lead[signal.name] = Math.round(Math.random() * 100)
      } else {
        lead[signal.name] = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
      }
    }
    leads.push(lead)
  }
  return leads
}

function scoreLead(lead: Record<string, unknown>, signals: readonly LeadSignal[]): number {
  let score = 0
  for (const signal of signals) {
    const val = lead[signal.name]
    if (signal.type === 'boolean' && val === true) {
      score += signal.weight
    } else if (signal.type === 'numeric' && typeof val === 'number') {
      score += (val / 100) * signal.weight
    } else if (signal.type === 'categorical' && val === 'high') {
      score += signal.weight
    } else if (signal.type === 'categorical' && val === 'medium') {
      score += signal.weight * 0.5
    }
  }
  return Math.round(Math.min(100, score))
}

export function LeadScoring({ data, onChange }: LeadScoringProps) {
  const leadsToScore = useMemo(
    () => data.leads.length > 0 ? data.leads : generateSampleLeads(data.signals),
    [data.leads, data.signals]
  )

  const scores = useMemo(
    () => leadsToScore.map((lead) => ({
      lead,
      score: scoreLead(lead, data.signals),
    })).sort((a, b) => b.score - a.score),
    [leadsToScore, data.signals]
  )

  const qualified = scores.filter((s) => s.score >= data.threshold)
  const unqualified = scores.filter((s) => s.score < data.threshold)

  // Score distribution histogram
  const distribution = useMemo(() => {
    const buckets = Array.from({ length: 10 }, () => 0)
    for (const s of scores) {
      const bucket = Math.min(9, Math.floor(s.score / 10))
      buckets[bucket]++
    }
    return buckets
  }, [scores])

  const maxBucket = Math.max(...distribution)

  const addSignal = () => {
    const newSignal: LeadSignal = {
      id: `sig-${Date.now()}`,
      name: 'New Signal',
      weight: 10,
      type: 'boolean',
    }
    onChange({ ...data, signals: [...data.signals, newSignal] })
  }

  const updateSignal = (id: string, updates: Partial<LeadSignal>) => {
    onChange({
      ...data,
      signals: data.signals.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })
  }

  const removeSignal = (id: string) => {
    onChange({ ...data, signals: data.signals.filter((s) => s.id !== id) })
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.trim().split('\n')
      if (lines.length < 2) return
      const headers = lines[0].split(',').map((h) => h.trim())
      const leads: Record<string, unknown>[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim())
        const lead: Record<string, unknown> = {}
        headers.forEach((h, j) => {
          const v = values[j]
          if (v === 'true' || v === 'false') lead[h] = v === 'true'
          else if (!isNaN(Number(v))) lead[h] = Number(v)
          else lead[h] = v
        })
        leads.push(lead)
      }
      onChange({ ...data, leads })
    }
    reader.readAsText(file)
  }

  return (
    <div className="h-full overflow-y-auto p-6 max-w-5xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Signals */}
        <div className="border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Scoring Signals</h3>
            <button onClick={addSignal} className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 font-medium">
              <Plus className="w-3 h-3" /> Add Signal
            </button>
          </div>
          <div className="space-y-2">
            {data.signals.map((signal) => (
              <div key={signal.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <input
                  value={signal.name}
                  onChange={(e) => updateSignal(signal.id, { name: e.target.value })}
                  className="flex-1 text-xs bg-transparent outline-none text-gray-700"
                />
                <select
                  value={signal.type}
                  onChange={(e) => updateSignal(signal.id, { type: e.target.value as LeadSignal['type'] })}
                  className="text-[10px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-600"
                >
                  <option value="boolean">Boolean</option>
                  <option value="numeric">Numeric</option>
                  <option value="categorical">Category</option>
                </select>
                <input
                  type="number"
                  value={signal.weight}
                  onChange={(e) => updateSignal(signal.id, { weight: parseInt(e.target.value) || 0 })}
                  className="w-14 text-xs font-mono bg-white border border-gray-200 rounded px-1.5 py-0.5 text-right"
                  min={0} max={100}
                />
                <button onClick={() => removeSignal(signal.id)} className="text-gray-400 hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-gray-400 mt-2 text-right">
            Total weight: {data.signals.reduce((s, sig) => s + sig.weight, 0)}
          </div>
        </div>

        {/* Threshold + Results */}
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Qualification Threshold</h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0} max={100}
                value={data.threshold}
                onChange={(e) => onChange({ ...data, threshold: parseInt(e.target.value) })}
                className="flex-1 accent-blue-600"
              />
              <span className="text-lg font-bold font-mono text-blue-600 w-12 text-right">{data.threshold}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-[10px] text-green-600 uppercase mb-0.5">Qualified</div>
                <div className="text-xl font-bold text-green-700">{qualified.length}</div>
                <div className="text-[10px] text-green-500">{((qualified.length / scores.length) * 100).toFixed(0)}% of leads</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 uppercase mb-0.5">Below Threshold</div>
                <div className="text-xl font-bold text-gray-600">{unqualified.length}</div>
                <div className="text-[10px] text-gray-400">{((unqualified.length / scores.length) * 100).toFixed(0)}% of leads</div>
              </div>
            </div>
          </div>

          {/* CSV Upload */}
          <div className="border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Import Leads</h3>
            <p className="text-[10px] text-gray-500 mb-3">Upload CSV with columns matching your signal names</p>
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">{data.leads.length > 0 ? `${data.leads.length} leads loaded` : 'Choose CSV'}</span>
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            </label>
            {data.leads.length === 0 && (
              <p className="text-[10px] text-gray-400 mt-2 text-center">Using {scores.length} simulated leads</p>
            )}
          </div>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Score Distribution</h3>
        <div className="flex items-end gap-1 h-32">
          {distribution.map((count, i) => {
            const h = maxBucket > 0 ? (count / maxBucket) * 100 : 0
            const isAboveThreshold = (i + 1) * 10 >= data.threshold
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t transition-colors ${isAboveThreshold ? 'bg-green-400' : 'bg-gray-300'}`}
                  style={{ height: `${h}%`, minHeight: count > 0 ? 4 : 0 }}
                />
                <span className="text-[8px] text-gray-400 font-mono">{i * 10}-{(i + 1) * 10}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-gray-500">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-green-400" />Qualified</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-gray-300" />Below Threshold</div>
        </div>
      </div>
    </div>
  )
}
