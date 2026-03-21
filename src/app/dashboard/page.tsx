'use client'

import { useState, useEffect, useCallback } from 'react'
import { TabBar } from '@/components/workspace/TabBar'
import { NewSimModal } from '@/components/workspace/NewSimModal'
import { ABTestSim } from '@/components/sims/ABTestSim'
import { RevenueForecast } from '@/components/sims/RevenueForecast'
import { CohortAnalysis } from '@/components/sims/CohortAnalysis'
import { PricingSim } from '@/components/sims/PricingSim'
import { LeadScoring } from '@/components/sims/LeadScoring'
import { FormAnalyzer } from '@/components/flow/FormAnalyzer'
import type { SimulationType, WorkspaceTab, SimTabData } from '@/lib/workspace-types'
import {
  loadWorkspace,
  createTab,
  closeTab,
  setActiveTab,
  renameTab,
  updateTabData,
  duplicateTab,
} from '@/lib/workspace-state'
import type { WorkspaceState } from '@/lib/workspace-types'
import {
  GitBranch, FlaskConical, TrendingUp, Users,
  DollarSign, Target, FormInput, Workflow, Sparkles,
} from 'lucide-react'

export default function DashboardPage() {
  const [workspace, setWorkspace] = useState<WorkspaceState>({ tabs: [], activeTabId: null })
  const [showNewModal, setShowNewModal] = useState(false)

  useEffect(() => {
    setWorkspace(loadWorkspace())
  }, [])

  const activeTab = workspace.tabs.find((t) => t.id === workspace.activeTabId)

  const handleCreate = useCallback((type: SimulationType) => {
    if (type === 'flow_builder') {
      window.location.href = '/dashboard/flow'
      return
    }
    if (type === 'pipeline') {
      window.location.href = '/dashboard/pipeline'
      return
    }
    setWorkspace(createTab(type))
  }, [])

  const handleClose = useCallback((id: string) => {
    setWorkspace(closeTab(id))
  }, [])

  const handleSelect = useCallback((id: string) => {
    setWorkspace(setActiveTab(id))
  }, [])

  const handleRename = useCallback((id: string, name: string) => {
    setWorkspace(renameTab(id, name))
  }, [])

  const handleDuplicate = useCallback((id: string) => {
    setWorkspace(duplicateTab(id))
  }, [])

  const handleDataChange = useCallback((tabId: string, data: SimTabData) => {
    setWorkspace(updateTabData(tabId, data))
  }, [])

  // Empty workspace welcome
  if (workspace.tabs.length === 0 && !showNewModal) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center max-w-lg">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'var(--accent-soft)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
          >
            <Sparkles className="w-7 h-7" style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Simulation Workbench</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            Model any measurable business process. Open multiple tabs. Compare results.
          </p>
          <div className="grid grid-cols-2 gap-2 max-w-md mx-auto mb-6">
            {[
              { type: 'ab_test' as SimulationType, label: 'A/B Test', icon: FlaskConical, color: '#F59E0B' },
              { type: 'revenue_forecast' as SimulationType, label: 'Revenue Forecast', icon: TrendingUp, color: '#22C55E' },
              { type: 'cohort_analysis' as SimulationType, label: 'Cohort Analysis', icon: Users, color: '#EC4899' },
              { type: 'pricing_sim' as SimulationType, label: 'Pricing Sim', icon: DollarSign, color: '#14B8A6' },
              { type: 'lead_scoring' as SimulationType, label: 'Lead Scoring', icon: Target, color: '#EF4444' },
              { type: 'form_analyzer' as SimulationType, label: 'Form Analyzer', icon: FormInput, color: '#8B5CF6' },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => handleCreate(item.type)}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl transition-all text-left"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = item.color}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}18` }}>
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-3">
            <a
              href="/dashboard/flow"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
              style={{ background: 'var(--accent)', color: '#000' }}
            >
              <GitBranch className="w-4 h-4" />
              Flow Builder
            </a>
            <a
              href="/dashboard/pipeline"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <Workflow className="w-4 h-4" />
              Pipeline Kanban
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <TabBar
        tabs={workspace.tabs}
        activeTabId={workspace.activeTabId}
        onSelect={handleSelect}
        onClose={handleClose}
        onRename={handleRename}
        onDuplicate={handleDuplicate}
        onNew={() => setShowNewModal(true)}
      />

      {/* Active tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab ? (
          <SimContent
            tab={activeTab}
            onDataChange={(data) => handleDataChange(activeTab.id, data)}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            Click a tab or create a new simulation
          </div>
        )}
      </div>

      <NewSimModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}

function SimContent({ tab, onDataChange }: { tab: WorkspaceTab; onDataChange: (data: SimTabData) => void }) {
  const { simData } = tab

  switch (simData.type) {
    case 'ab_test':
      return (
        <ABTestSim
          data={simData.data}
          onChange={(d) => onDataChange({ type: 'ab_test', data: d })}
        />
      )
    case 'revenue_forecast':
      return (
        <RevenueForecast
          data={simData.data}
          onChange={(d) => onDataChange({ type: 'revenue_forecast', data: d })}
        />
      )
    case 'cohort_analysis':
      return (
        <CohortAnalysis
          data={simData.data}
          onChange={(d) => onDataChange({ type: 'cohort_analysis', data: d })}
        />
      )
    case 'pricing_sim':
      return (
        <PricingSim
          data={simData.data}
          onChange={(d) => onDataChange({ type: 'pricing_sim', data: d })}
        />
      )
    case 'lead_scoring':
      return (
        <LeadScoring
          data={simData.data}
          onChange={(d) => onDataChange({ type: 'lead_scoring', data: d })}
        />
      )
    case 'form_analyzer':
      return <FormAnalyzer />
    case 'flow_builder':
      return (
        <div className="h-full flex items-center justify-center">
          <a href="/dashboard/flow" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
            Open Flow Builder
          </a>
        </div>
      )
    case 'pipeline':
      return (
        <div className="h-full flex items-center justify-center">
          <a href="/dashboard/pipeline" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
            Open Pipeline
          </a>
        </div>
      )
    default:
      return <div className="h-full flex items-center justify-center text-gray-400">Unknown simulation type</div>
  }
}
