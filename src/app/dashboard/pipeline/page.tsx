'use client'

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Download,
  BarChart3,
  Activity,
  Zap,
  AlertTriangle,
  Trash2,
  X,
} from 'lucide-react'
import {
  loadState,
  moveItem,
  addItems,
  deleteItem,
  clearSampleItems,
  getPipelineStages,
  getPipelineItems,
  getPipelineHistory,
  generateId,
} from '@/lib/state'
import { getTemplateByType } from '@/lib/templates'
import { getStageHealth, getBottleneckScore } from '@/lib/utils/health'
import {
  runMonteCarlo,
  runSensitivityAnalysis,
  runForecast,
  checkDataSufficiency,
} from '@/lib/services/simulation'
import { computeMetrics, detectAnomalies, generateFallbackTips } from '@/lib/services/analytics'
import { exportPipelineCSV, exportPipelineJSON, downloadFile } from '@/lib/export'
import KanbanBoard from '@/components/KanbanBoard'
import FunnelChart from '@/components/FunnelChart'
import BottleneckHeatMap from '@/components/BottleneckHeatMap'
import SimulationPanel from '@/components/SimulationPanel'
import type { Item } from '@/lib/types'
import type { AppState } from '@/lib/state'

type Tab = 'kanban' | 'analytics' | 'simulation'

export default function PipelineDetailWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading...</div>}>
      <PipelineDetailPage />
    </Suspense>
  )
}

function PipelineDetailPage() {
  const searchParams = useSearchParams()
  const pipelineId = searchParams.get('id')

  const [state, setState] = useState<AppState>({
    pipelines: [],
    stages: [],
    items: [],
    history: [],
  })
  const [activeTab, setActiveTab] = useState<Tab>('kanban')
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemValue, setNewItemValue] = useState('')

  useEffect(() => {
    setState(loadState())
  }, [])

  const pipeline = state.pipelines.find((p) => p.id === pipelineId)
  const stages = useMemo(
    () => (pipelineId ? getPipelineStages(state, pipelineId) : []),
    [state, pipelineId]
  )
  const items = useMemo(
    () => (pipelineId ? getPipelineItems(state, pipelineId) : []),
    [state, pipelineId]
  )
  const history = useMemo(
    () => (pipelineId ? getPipelineHistory(state, pipelineId) : []),
    [state, pipelineId]
  )

  const metrics = useMemo(
    () => computeMetrics(stages, items, history),
    [stages, items, history]
  )

  const template = pipeline ? getTemplateByType(pipeline.type) : undefined
  const hasSampleItems = items.some((i) => i.isSample)

  const handleItemMove = useCallback(
    (itemId: string, toStageId: string) => {
      setState(moveItem(itemId, toStageId))
    },
    []
  )

  const handleAddItem = () => {
    if (!newItemTitle.trim() || !pipelineId || stages.length === 0) return

    const now = new Date().toISOString()
    const item: Item = {
      id: generateId('item'),
      pipelineId,
      stageId: stages[0].id,
      title: newItemTitle.trim(),
      description: null,
      value: parseFloat(newItemValue) || 0,
      metadata: {},
      enteredAt: now,
      updatedAt: now,
    }

    setState(addItems([item]))
    setNewItemTitle('')
    setNewItemValue('')
    setShowAddItem(false)
  }

  const handleDeleteItem = useCallback((itemId: string) => {
    setState(deleteItem(itemId))
  }, [])

  const handleClearSamples = () => {
    if (!pipelineId) return
    setState(clearSampleItems(pipelineId))
  }

  const handleExportCSV = () => {
    if (!pipeline) return
    const csv = exportPipelineCSV(pipeline, stages, items)
    downloadFile(csv, `${pipeline.name.toLowerCase().replace(/\s+/g, '-')}.csv`, 'text/csv')
  }

  const handleExportJSON = () => {
    if (!pipeline) return
    const json = exportPipelineJSON(pipeline, stages, items, metrics)
    downloadFile(json, `${pipeline.name.toLowerCase().replace(/\s+/g, '-')}.json`, 'application/json')
  }

  if (!pipeline) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <p className="text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>
          Pipeline not found.
        </p>
        <Link
          href="/dashboard"
          className="text-sm font-medium"
          style={{ color: 'var(--blue)' }}
        >
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const TABS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: 'kanban', label: 'Kanban Board', icon: Activity },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'simulation', label: 'Simulation', icon: Zap },
  ]

  const totalValue = items.reduce((sum, i) => sum + i.value, 0)

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard"
          className="p-2 rounded-lg transition-all hover:bg-[var(--bg-alt)]"
        >
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black">{pipeline.name}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {pipeline.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddItem(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-all hover:scale-105"
            style={{ background: 'var(--blue)' }}
          >
            <Plus size={14} />
            Add Item
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <Download size={14} />
            CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <Download size={14} />
            JSON
          </button>
        </div>
      </div>

      {/* Sample Data Banner */}
      {hasSampleItems && (
        <div
          className="flex items-center justify-between p-4 rounded-lg mb-6"
          style={{ background: 'var(--blue-soft)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
        >
          <p className="text-sm" style={{ color: 'var(--blue)' }}>
            These are example items to show how the tool works. Delete them and add your real data.
          </p>
          <button
            onClick={handleClearSamples}
            className="px-3 py-1 rounded text-xs font-bold transition-all hover:scale-105"
            style={{ background: 'var(--blue)', color: 'white' }}
          >
            Clear All Samples
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div
        className="grid grid-cols-5 gap-4 mb-6 p-4 rounded-xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Items</p>
          <p className="text-xl font-black">{items.length}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Value</p>
          <p className="text-xl font-black" style={{ color: 'var(--green)' }}>
            ${totalValue.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Velocity</p>
          <p className="text-xl font-black">{metrics.velocity}/day</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Conversion</p>
          <p className="text-xl font-black">{Math.round(metrics.conversionRate * 100)}%</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Throughput</p>
          <p className="text-xl font-black">{metrics.throughput}/wk</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === key ? 'var(--blue-soft)' : 'transparent',
              color: activeTab === key ? 'var(--blue)' : 'var(--text-secondary)',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'kanban' && (
        <KanbanBoard
          stages={stages}
          items={items}
          onItemMove={handleItemMove}
          onDeleteItem={handleDeleteItem}
        />
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FunnelChart
            stages={stages}
            items={items}
            benchmarks={template?.benchmarks}
          />
          <BottleneckHeatMap stages={stages} items={items} />
          {/* Anomaly Detection */}
          <div
            className="p-6 rounded-xl lg:col-span-2"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle size={18} style={{ color: 'var(--amber)' }} />
              Anomaly Detection
            </h3>
            {(() => {
              const result = detectAnomalies(stages, items, pipeline.createdAt)
              if (!result.isActive) {
                return (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {result.message}
                  </p>
                )
              }
              if (result.anomalies.length === 0) {
                return (
                  <p className="text-sm" style={{ color: 'var(--green)' }}>
                    {result.message}
                  </p>
                )
              }
              return (
                <div className="space-y-2">
                  <p className="text-sm mb-3" style={{ color: 'var(--amber)' }}>
                    {result.message}
                  </p>
                  {result.anomalies.map((a) => (
                    <div
                      key={a.itemId}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: 'var(--amber-soft)' }}
                    >
                      <span className="text-sm font-medium">{a.itemTitle}</span>
                      <span className="text-xs" style={{ color: 'var(--amber)' }}>
                        {a.daysStuck}d in {a.stageName}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
          {/* Fallback Tips */}
          <div
            className="p-6 rounded-xl lg:col-span-2"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-lg font-bold mb-4">AI Insights</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              AI insights available when Claude API is configured. Here are data-driven tips:
            </p>
            <div className="space-y-2">
              {generateFallbackTips(stages, items).map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-3 rounded-lg"
                  style={{ background: 'var(--bg)' }}
                >
                  <Zap size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--amber)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'simulation' && (
        <SimulationPanel
          stages={stages}
          items={items}
          history={history}
        />
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-md rounded-xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Item</h2>
              <button onClick={() => setShowAddItem(false)}>
                <X size={18} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Title
                </label>
                <input
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder="e.g., Acme Corp Deal"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Value ($)
                </label>
                <input
                  type="number"
                  value={newItemValue}
                  onChange={(e) => setNewItemValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder="0"
                />
              </div>
              <button
                onClick={handleAddItem}
                disabled={!newItemTitle.trim()}
                className="w-full py-2 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: 'var(--blue)' }}
              >
                Add to {stages[0]?.name ?? 'First Stage'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
