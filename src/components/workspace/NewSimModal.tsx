'use client'

import { SIM_TYPES, type SimulationType } from '@/lib/workspace-types'
import {
  GitBranch, FormInput, Workflow, FlaskConical,
  TrendingUp, Users, DollarSign, Target, X,
} from 'lucide-react'

const ICONS: Record<string, typeof GitBranch> = {
  GitBranch, FormInput, Workflow, FlaskConical,
  TrendingUp, Users, DollarSign, Target,
}

interface NewSimModalProps {
  open: boolean
  onClose: () => void
  onCreate: (type: SimulationType) => void
}

export function NewSimModal({ open, onClose, onCreate }: NewSimModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">New Simulation</h2>
            <p className="text-xs text-gray-500 mt-0.5">Choose what you want to model</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 p-6">
          {SIM_TYPES.map((sim) => {
            const Icon = ICONS[sim.icon] || Workflow
            return (
              <button
                key={sim.type}
                onClick={() => {
                  onCreate(sim.type)
                  onClose()
                }}
                className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left group"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${sim.color}15` }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: sim.color }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                    {sim.label}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    {sim.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
