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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>New Simulation</h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Choose what you want to model</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 p-4">
          {SIM_TYPES.map((sim) => {
            const Icon = ICONS[sim.icon] || Workflow
            return (
              <button
                key={sim.type}
                onClick={() => { onCreate(sim.type); onClose() }}
                className="flex items-start gap-3 p-4 rounded-xl text-left group transition-all"
                style={{ border: '1px solid var(--border)' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = sim.color}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${sim.color}18` }}
                >
                  <Icon className="w-4 h-4" style={{ color: sim.color }} />
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{sim.label}</div>
                  <div className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
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
