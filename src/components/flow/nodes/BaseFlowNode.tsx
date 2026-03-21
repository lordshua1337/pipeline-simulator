'use client'

import { useDraggable } from '@dnd-kit/core'
import { NODE_TYPE_META, type FlowNode } from '@/lib/flow-types'
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
  computedTraffic?: number
}

export function BaseFlowNode({ node, selected, onSelect, computedTraffic }: BaseFlowNodeProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `canvas-node-${node.id}`,
    data: { type: 'canvas-node', nodeId: node.id },
  })

  const meta = NODE_TYPE_META[node.type]
  const Icon = ICONS[node.type] || Puzzle
  const traffic = computedTraffic ?? node.metrics.trafficVolume
  const convPct = (node.metrics.conversionRate * 100).toFixed(0)

  const style: React.CSSProperties = {
    position: 'absolute',
    left: node.position.x,
    top: node.position.y,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    zIndex: isDragging ? 50 : selected ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
    width: 200,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(node.id)
      }}
      className="group"
    >
      {/* Input port */}
      <div
        className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white bg-gray-300 hover:bg-blue-400 transition-colors z-20 cursor-crosshair"
        data-port="input"
        data-node-id={node.id}
      />

      {/* Node body */}
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
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ backgroundColor: meta.color }}
          >
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-semibold text-gray-900 truncate flex-1">
            {node.label}
          </span>
        </div>

        {/* Metrics */}
        <div className="px-3 py-2 space-y-1">
          {traffic > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Traffic</span>
              <span className="text-[10px] font-mono font-medium text-gray-700">
                {traffic.toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500">Conv. Rate</span>
            <span className="text-[10px] font-mono font-medium text-gray-700">{convPct}%</span>
          </div>
          {node.metrics.revenuePerSale > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Revenue</span>
              <span className="text-[10px] font-mono font-medium text-green-600">
                ${node.metrics.revenuePerSale}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Output port */}
      <div
        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white bg-gray-300 hover:bg-blue-400 transition-colors z-20 cursor-crosshair"
        data-port="output"
        data-node-id={node.id}
      />
    </div>
  )
}
