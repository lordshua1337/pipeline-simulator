'use client'

import { useDraggable } from '@dnd-kit/core'
import { NODE_TYPE_META, type FlowNode } from '@/lib/flow-types'
import { NODE_VARIANTS } from '@/lib/node-variants'
import {
  Globe, FileText, FormInput, DollarSign, TrendingUp,
  TrendingDown, Mail, CreditCard, Heart, Puzzle,
} from 'lucide-react'

const ICONS: Record<string, typeof Globe> = {
  traffic_source: Globe,
  landing_page: FileText,
  opt_in_form: FormInput,
  sales_page: DollarSign,
  upsell: TrendingUp,
  downsell: TrendingDown,
  email_sequence: Mail,
  checkout: CreditCard,
  thank_you: Heart,
  custom: Puzzle,
}

interface BaseFlowNodeProps {
  node: FlowNode
  selected: boolean
  onSelect: (id: string) => void
  onDuplicate?: (nodeId: string) => void
  onPortDown?: (nodeId: string) => void
  onPortUp?: (nodeId: string) => void
  computedTraffic?: number
}

export const NODE_W = 200
export const NODE_H_MIN = 85

export function BaseFlowNode({ node, selected, onSelect, onDuplicate, onPortDown, onPortUp, computedTraffic }: BaseFlowNodeProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `canvas-node-${node.id}`,
    data: { type: 'canvas-node', nodeId: node.id },
  })

  const meta = NODE_TYPE_META[node.type]
  const Icon = ICONS[node.type] || Puzzle
  const traffic = computedTraffic ?? node.metrics.trafficVolume
  const convPct = (node.metrics.conversionRate * 100).toFixed(0)

  // Get variant label if set
  const variantId = node.config?.variant as string | undefined
  const variants = NODE_VARIANTS[node.type]
  const variant = variantId ? variants?.find((v) => v.id === variantId) : null

  const style: React.CSSProperties = {
    position: 'absolute',
    left: node.position.x,
    top: node.position.y,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    zIndex: isDragging ? 50 : selected ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
    width: NODE_W,
  }

  // Collect non-zero metrics to display
  const metrics: { label: string; value: string }[] = []
  if (traffic > 0) metrics.push({ label: 'Traffic', value: traffic.toLocaleString() })
  metrics.push({ label: 'Conv.', value: `${convPct}%` })
  if (node.metrics.revenuePerSale > 0) metrics.push({ label: 'Rev', value: `$${node.metrics.revenuePerSale}` })
  if (node.metrics.costPerClick > 0) metrics.push({ label: 'CPC', value: `$${node.metrics.costPerClick}` })
  if (node.metrics.costPerLead > 0) metrics.push({ label: 'CPL', value: `$${node.metrics.costPerLead}` })
  if (node.metrics.timeInStageHours > 0) metrics.push({ label: 'Time', value: `${node.metrics.timeInStageHours}h` })
  if (node.metrics.dropOffRate > 0) metrics.push({ label: 'Drop', value: `${(node.metrics.dropOffRate * 100).toFixed(0)}%` })

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => { e.stopPropagation(); onSelect(node.id) }}
      onDoubleClick={(e) => { e.stopPropagation(); onDuplicate?.(node.id) }}
      className="group"
    >
      {/* 4 connection ports */}
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
        const pos: React.CSSProperties =
          side === 'top' ? { top: -6, left: '50%', transform: 'translateX(-50%)' } :
          side === 'right' ? { right: -6, top: '50%', transform: 'translateY(-50%)' } :
          side === 'bottom' ? { bottom: -6, left: '50%', transform: 'translateX(-50%)' } :
          { left: -6, top: '50%', transform: 'translateY(-50%)' }

        return (
          <div
            key={side}
            className="absolute w-4 h-4 rounded-full border-2 border-white bg-gray-300 hover:bg-blue-400 hover:scale-150 transition-all z-30 cursor-crosshair"
            style={pos}
            data-port="port"
            data-port-side={side}
            data-node-id={node.id}
            onPointerDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onPortDown?.(node.id)
            }}
            onPointerUp={(e) => {
              e.stopPropagation()
              onPortUp?.(node.id)
            }}
          />
        )
      })}

      {/* Node body -- DRAG HANDLE */}
      <div
        {...listeners}
        {...attributes}
        className={`bg-white rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md ${
          selected ? 'border-blue-500 shadow-blue-100' : 'border-gray-200'
        }`}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-t-[10px]"
          style={{ backgroundColor: `${meta.color}10` }}
        >
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: variant?.icon ? 'white' : meta.color }}
          >
            {variant?.icon ? (
              <img src={variant.icon} alt="" className="w-4 h-4 object-contain" />
            ) : (
              <Icon className="w-3.5 h-3.5 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-gray-900 truncate block">
              {node.label}
            </span>
            {variant && (
              <span className="text-[9px] text-gray-500 truncate block">{variant.label}</span>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="px-3 py-1.5 space-y-0.5">
          {metrics.map((m) => (
            <div key={m.label} className="flex items-center justify-between">
              <span className="text-[9px] text-gray-400">{m.label}</span>
              <span className="text-[9px] font-mono font-medium text-gray-600">{m.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
