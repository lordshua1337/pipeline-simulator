'use client'

import { NODE_TYPE_META, type FlowNode, type FlowNodeMetrics } from '@/lib/flow-types'
import { NODE_VARIANTS } from '@/lib/node-variants'
import { X, Trash2 } from 'lucide-react'

interface NodeConfigPanelProps {
  node: FlowNode
  onUpdate: (nodeId: string, updates: Partial<FlowNode>) => void
  onDelete: (nodeId: string) => void
  onClose: () => void
}

const METRIC_FIELDS: { key: keyof FlowNodeMetrics; label: string; suffix: string; step: string; min: number; max?: number }[] = [
  { key: 'trafficVolume', label: 'Traffic Volume', suffix: 'visitors', step: '100', min: 0 },
  { key: 'conversionRate', label: 'Conversion Rate', suffix: '%', step: '0.01', min: 0, max: 1 },
  { key: 'costPerClick', label: 'Cost Per Click', suffix: '$', step: '0.01', min: 0 },
  { key: 'costPerLead', label: 'Cost Per Lead', suffix: '$', step: '0.01', min: 0 },
  { key: 'revenuePerSale', label: 'Revenue Per Sale', suffix: '$', step: '1', min: 0 },
  { key: 'timeInStageHours', label: 'Time in Stage', suffix: 'hrs', step: '1', min: 0 },
  { key: 'dropOffRate', label: 'Drop-off Rate', suffix: '%', step: '0.01', min: 0, max: 1 },
]

export function NodeConfigPanel({ node, onUpdate, onDelete, onClose }: NodeConfigPanelProps) {
  const meta = NODE_TYPE_META[node.type]

  const handleLabelChange = (value: string) => {
    onUpdate(node.id, { label: value })
  }

  const handleMetricChange = (key: keyof FlowNodeMetrics, raw: string) => {
    const value = parseFloat(raw)
    if (isNaN(value)) return
    onUpdate(node.id, {
      metrics: { ...node.metrics, [key]: value },
    })
  }

  const displayValue = (key: keyof FlowNodeMetrics): string => {
    const val = node.metrics[key]
    if (key === 'conversionRate' || key === 'dropOffRate') {
      return (val * 100).toFixed(0)
    }
    return val.toString()
  }

  return (
    <div className="w-[280px] border-l border-gray-200 bg-white flex-shrink-0 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ backgroundColor: meta.color }}
          >
            <span className="text-white text-[10px] font-bold">
              {meta.label[0]}
            </span>
          </div>
          <span className="text-xs font-semibold text-gray-700">{meta.label}</span>
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center">
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      {/* Label */}
      <div className="px-4 py-3 border-b border-gray-100">
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Label
        </label>
        <input
          type="text"
          value={node.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          className="w-full px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white"
        />
      </div>

      {/* Variant selector with icons */}
      {NODE_VARIANTS[node.type] && NODE_VARIANTS[node.type].length > 1 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Type
          </label>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {NODE_VARIANTS[node.type].map((v) => {
              const isActive = (node.config?.variant as string) === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    onUpdate(node.id, {
                      config: { ...node.config, variant: v.id },
                      label: v.label,
                    })
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all ${
                    isActive ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'
                  }`}
                >
                  {v.icon ? (
                    <img src={v.icon} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-500 flex-shrink-0">
                      {v.emoji}
                    </span>
                  )}
                  <span className={`text-[11px] ${isActive ? 'font-medium text-blue-700' : 'text-gray-700'}`}>
                    {v.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="px-4 py-3 flex-1">
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Metrics
        </label>
        <div className="space-y-3">
          {METRIC_FIELDS.map((field) => (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-gray-600">{field.label}</span>
                <span className="text-[10px] text-gray-400">{field.suffix}</span>
              </div>
              <input
                type="number"
                value={displayValue(field.key)}
                onChange={(e) => {
                  const raw = e.target.value
                  if (field.key === 'conversionRate' || field.key === 'dropOffRate') {
                    const pct = parseFloat(raw)
                    if (!isNaN(pct)) {
                      handleMetricChange(field.key, (pct / 100).toString())
                    }
                  } else {
                    handleMetricChange(field.key, raw)
                  }
                }}
                step={field.key === 'conversionRate' || field.key === 'dropOffRate' ? '1' : field.step}
                min={field.key === 'conversionRate' || field.key === 'dropOffRate' ? 0 : field.min}
                max={field.key === 'conversionRate' || field.key === 'dropOffRate' ? 100 : field.max}
                className="w-full px-2.5 py-1.5 text-sm font-mono bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Delete */}
      <div className="px-4 py-3 border-t border-gray-100">
        <button
          onClick={() => onDelete(node.id)}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Node
        </button>
      </div>
    </div>
  )
}
