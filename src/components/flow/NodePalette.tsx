'use client'

import { useDraggable } from '@dnd-kit/core'
import { NODE_TYPE_META, type FlowNodeType } from '@/lib/flow-types'
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

const CATEGORIES = ['Traffic', 'Pages', 'Capture', 'Revenue', 'Nurture', 'Other'] as const

function PaletteItem({ nodeType }: { nodeType: FlowNodeType }) {
  const meta = NODE_TYPE_META[nodeType]
  const Icon = ICONS[nodeType] || Puzzle

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${nodeType}`,
    data: { type: 'palette-item', nodeType },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'hover:bg-gray-100'
      }`}
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${meta.color}15` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
      </div>
      <span className="text-xs font-medium text-gray-700">{meta.label}</span>
    </div>
  )
}

export function NodePalette() {
  const nodeTypes = Object.keys(NODE_TYPE_META) as FlowNodeType[]

  return (
    <div className="w-[200px] border-r border-gray-200 bg-white flex-shrink-0 overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Components</h3>
        <p className="text-[10px] text-gray-400 mt-0.5">Drag onto canvas</p>
      </div>

      <div className="py-2">
        {CATEGORIES.map((category) => {
          const items = nodeTypes.filter((t) => NODE_TYPE_META[t].category === category)
          if (items.length === 0) return null

          return (
            <div key={category} className="mb-2">
              <div className="px-4 py-1">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {category}
                </span>
              </div>
              {items.map((type) => (
                <PaletteItem key={type} nodeType={type} />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
