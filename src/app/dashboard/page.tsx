'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Copy, Archive } from 'lucide-react'
import { PIPELINE_TEMPLATES } from '@/lib/templates'
import {
  loadState,
  createPipeline,
  addStages,
  addItems,
  deletePipeline,
  generateId,
} from '@/lib/state'
import type { Pipeline, Stage, Item } from '@/lib/types'
import type { AppState } from '@/lib/state'

export default function DashboardPage() {
  const [state, setState] = useState<AppState>({ pipelines: [], stages: [], items: [], history: [] })
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    setState(loadState())
  }, [])

  const handleCreate = (templateId: string) => {
    const template = PIPELINE_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return

    const now = new Date().toISOString()
    const pipelineId = generateId('pipe')

    const pipeline: Pipeline = {
      id: pipelineId,
      name: template.name,
      description: template.description,
      type: template.type,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }

    let s = createPipeline(pipeline)

    const stages: Stage[] = template.config.stages.map((stageConf, idx) => ({
      id: generateId('stage'),
      pipelineId,
      name: stageConf.name,
      description: stageConf.description ?? null,
      position: idx + 1,
      color: stageConf.color,
      autoAdvanceEnabled: false,
      autoAdvanceDays: 0,
      slaWarningHours: 48,
      createdAt: now,
    }))

    s = addStages(stages)

    if (template.config.sampleItems) {
      const items: Item[] = template.config.sampleItems.map((si) => ({
        id: generateId('item'),
        pipelineId,
        stageId: stages[si.stageIndex]?.id ?? stages[0].id,
        title: si.title,
        description: si.description ?? null,
        value: si.value,
        metadata: {},
        enteredAt: now,
        updatedAt: now,
        isSample: true,
      }))

      s = addItems(items)
    }

    setState(s)
    setShowCreate(false)
  }

  const handleDelete = (id: string) => {
    setState(deletePipeline(id))
  }

  const pipelines = state.pipelines.filter((p) => p.status !== 'archived')

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1">Your Pipelines</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage and simulate your multi-stage processes.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:scale-105"
          style={{ background: 'var(--blue)' }}
        >
          <Plus size={16} />
          New Pipeline
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <h2 className="text-xl font-bold mb-4">Choose a Template</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PIPELINE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleCreate(tpl.id)}
                  className="p-4 rounded-lg text-left transition-all hover:scale-[1.02]"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderLeft: `4px solid ${tpl.color}`,
                  }}
                >
                  <h3 className="font-bold text-sm mb-1">{tpl.name}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {tpl.description}
                  </p>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    {tpl.config.stages.length} stages
                    {tpl.config.sampleItems
                      ? ` / ${tpl.config.sampleItems.length} sample items`
                      : ''}
                  </p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCreate(false)}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pipeline Cards */}
      {pipelines.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg mb-2" style={{ color: 'var(--text-secondary)' }}>
            No pipelines yet.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm font-medium"
            style={{ color: 'var(--blue)' }}
          >
            Create your first pipeline from a template.
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pipelines.map((pipeline) => {
            const stages = state.stages
              .filter((s) => s.pipelineId === pipeline.id)
              .sort((a, b) => a.position - b.position)
            const items = state.items.filter((i) => i.pipelineId === pipeline.id)
            const totalValue = items.reduce((sum, i) => sum + i.value, 0)
            const template = PIPELINE_TEMPLATES.find((t) => t.type === pipeline.type)

            return (
              <div
                key={pipeline.id}
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderTop: `3px solid ${template?.color ?? 'var(--blue)'}`,
                }}
              >
                <Link
                  href={`/dashboard/pipeline?id=${pipeline.id}`}
                  className="block p-5 transition-all hover:bg-[var(--bg-alt)]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-bold">{pipeline.name}</h3>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {pipeline.description}
                      </p>
                    </div>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded"
                      style={{
                        background: 'var(--blue-soft)',
                        color: 'var(--blue)',
                      }}
                    >
                      {pipeline.type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Stage preview */}
                  <div className="flex gap-1 mb-3">
                    {stages.map((stage) => {
                      const count = items.filter((i) => i.stageId === stage.id).length
                      return (
                        <div key={stage.id} className="flex-1">
                          <div
                            className="h-1.5 rounded-full mb-1"
                            style={{ background: stage.color }}
                          />
                          <p className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>
                            {stage.name} ({count})
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span>{items.length} items</span>
                    <span>{stages.length} stages</span>
                    {totalValue > 0 && (
                      <span style={{ color: 'var(--green)' }}>
                        ${totalValue.toLocaleString()}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Actions */}
                <div
                  className="flex items-center justify-end gap-2 px-5 py-2"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <button
                    onClick={() => handleDelete(pipeline.id)}
                    className="p-1.5 rounded transition-all hover:bg-[var(--red-soft)]"
                    title="Delete pipeline"
                  >
                    <Trash2 size={14} style={{ color: 'var(--red)' }} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
