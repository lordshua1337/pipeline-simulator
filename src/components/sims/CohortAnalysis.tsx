'use client'

import { useMemo } from 'react'
import type { CohortData, CohortRow } from '@/lib/workspace-types'
import { Users, DollarSign, TrendingDown } from 'lucide-react'

interface CohortAnalysisProps {
  data: CohortData
  onChange: (data: CohortData) => void
}

function getRetentionColor(pct: number): string {
  if (pct >= 80) return 'bg-green-500'
  if (pct >= 60) return 'bg-green-400'
  if (pct >= 40) return 'bg-yellow-400'
  if (pct >= 20) return 'bg-orange-400'
  if (pct > 0) return 'bg-red-400'
  return 'bg-gray-100'
}

function fmt(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export function CohortAnalysis({ data, onChange }: CohortAnalysisProps) {
  const maxMonths = useMemo(
    () => Math.max(...data.cohorts.map((c) => c.retention.length)),
    [data.cohorts]
  )

  const ltvByCohort = useMemo(
    () => data.cohorts.map((c) => {
      const totalRetention = c.retention.reduce((sum, r) => sum + r / 100, 0)
      return {
        cohort: c.cohort,
        ltv: totalRetention * data.avgRevenuePerUser,
        avgRetention: c.retention.length > 1
          ? c.retention.slice(1).reduce((s, r) => s + r, 0) / (c.retention.length - 1)
          : 100,
      }
    }),
    [data]
  )

  const avgChurnByMonth = useMemo(() => {
    const result: number[] = []
    for (let m = 1; m < maxMonths; m++) {
      const rates: number[] = []
      for (const c of data.cohorts) {
        if (c.retention[m] !== undefined && c.retention[m] > 0 && c.retention[m - 1] > 0) {
          rates.push(100 - (c.retention[m] / c.retention[m - 1]) * 100)
        }
      }
      result.push(rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0)
    }
    return result
  }, [data.cohorts, maxMonths])

  const updateCohort = (index: number, field: keyof CohortRow, value: unknown) => {
    const updated = data.cohorts.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    )
    onChange({ ...data, cohorts: updated })
  }

  const updateRetention = (cohortIdx: number, monthIdx: number, value: number) => {
    const cohort = data.cohorts[cohortIdx]
    const newRetention = cohort.retention.map((r, i) => (i === monthIdx ? value : r))
    updateCohort(cohortIdx, 'retention', newRetention)
  }

  return (
    <div className="h-full overflow-y-auto p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cohort Retention</h2>
          <p className="text-xs text-gray-500 mt-0.5">Click any cell to edit retention percentages</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500">Avg Revenue/User</label>
          <input
            type="number"
            value={data.avgRevenuePerUser}
            onChange={(e) => onChange({ ...data, avgRevenuePerUser: parseFloat(e.target.value) || 0 })}
            className="w-20 px-2 py-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Retention Heatmap */}
      <div className="border border-gray-200 rounded-xl p-5 mb-6 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 text-gray-500 uppercase tracking-wider">Cohort</th>
              <th className="text-right py-2 px-2 text-gray-500 uppercase tracking-wider">Acquired</th>
              {Array.from({ length: maxMonths }).map((_, i) => (
                <th key={i} className="text-center py-2 px-2 text-gray-500 uppercase tracking-wider">
                  M{i}
                </th>
              ))}
              <th className="text-right py-2 px-2 text-gray-500 uppercase tracking-wider">LTV</th>
            </tr>
          </thead>
          <tbody>
            {data.cohorts.map((cohort, ci) => {
              const ltv = ltvByCohort[ci]
              return (
                <tr key={ci} className="border-t border-gray-100">
                  <td className="py-1.5 px-2 font-medium text-gray-700">{cohort.cohort}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-gray-600">{cohort.acquired}</td>
                  {Array.from({ length: maxMonths }).map((_, mi) => {
                    const val = cohort.retention[mi]
                    if (val === undefined || val === 0 && mi > 0) {
                      return <td key={mi} className="py-1.5 px-1"><div className="w-full h-7 bg-gray-50 rounded" /></td>
                    }
                    return (
                      <td key={mi} className="py-1.5 px-1">
                        <div className={`w-full h-7 rounded flex items-center justify-center text-white text-[10px] font-mono font-medium ${getRetentionColor(val)}`}>
                          <input
                            type="number"
                            value={val}
                            onChange={(e) => updateRetention(ci, mi, parseInt(e.target.value) || 0)}
                            className="w-full h-full text-center bg-transparent text-white text-[10px] font-mono font-medium outline-none"
                            min={0} max={100}
                          />
                        </div>
                      </td>
                    )
                  })}
                  <td className="py-1.5 px-2 text-right font-mono font-medium text-green-600">
                    {fmt(ltv?.ltv || 0)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {/* LTV by cohort */}
        <div className="border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">LTV by Cohort</h3>
          <div className="space-y-2">
            {ltvByCohort.map((c) => (
              <div key={c.cohort} className="flex items-center justify-between">
                <span className="text-xs text-gray-700">{c.cohort}</span>
                <span className="text-xs font-mono font-medium text-green-600">{fmt(c.ltv)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Avg churn by month */}
        <div className="border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Avg Churn by Month</h3>
          <div className="space-y-2">
            {avgChurnByMonth.map((churn, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-gray-700">Month {i + 1}</span>
                <span className={`text-xs font-mono font-medium ${churn > 20 ? 'text-red-500' : 'text-gray-600'}`}>
                  {churn.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Insights</h3>
          <div className="space-y-3 text-xs text-gray-600">
            <div className="flex items-start gap-2">
              <TrendingDown className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
              <span>Biggest drop: Month {avgChurnByMonth.indexOf(Math.max(...avgChurnByMonth)) + 1} ({Math.max(...avgChurnByMonth).toFixed(0)}% churn)</span>
            </div>
            <div className="flex items-start gap-2">
              <DollarSign className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Best cohort: {ltvByCohort.reduce((best, c) => c.ltv > best.ltv ? c : best).cohort} ({fmt(Math.max(...ltvByCohort.map(c => c.ltv)))} LTV)</span>
            </div>
            <div className="flex items-start gap-2">
              <Users className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>Total acquired: {data.cohorts.reduce((s, c) => s + c.acquired, 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
