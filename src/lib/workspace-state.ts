// Workspace -- Multi-tab State Management

import type { WorkspaceState, WorkspaceTab, SimTabData, SimulationType } from './workspace-types'
import {
  DEFAULT_AB_TEST,
  DEFAULT_REVENUE,
  DEFAULT_COHORT,
  DEFAULT_PRICING,
  DEFAULT_LEAD_SCORING,
  DEFAULT_FORM,
  SIM_TYPES,
} from './workspace-types'

const STORAGE_KEY = 'pipeline-workspace'

const DEFAULT_STATE: WorkspaceState = {
  tabs: [],
  activeTabId: null,
}

let counter = 0
export function genId(prefix: string = 'tab'): string {
  counter += 1
  return `${prefix}-${Date.now()}-${counter}`
}

export function loadWorkspace(): WorkspaceState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    return JSON.parse(raw) as WorkspaceState
  } catch {
    return DEFAULT_STATE
  }
}

function save(state: WorkspaceState): WorkspaceState {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
  return state
}

function getDefaultData(type: SimulationType): SimTabData {
  switch (type) {
    case 'ab_test': return { type: 'ab_test', data: DEFAULT_AB_TEST }
    case 'revenue_forecast': return { type: 'revenue_forecast', data: DEFAULT_REVENUE }
    case 'cohort_analysis': return { type: 'cohort_analysis', data: DEFAULT_COHORT }
    case 'pricing_sim': return { type: 'pricing_sim', data: DEFAULT_PRICING }
    case 'lead_scoring': return { type: 'lead_scoring', data: DEFAULT_LEAD_SCORING }
    case 'form_analyzer': return { type: 'form_analyzer', data: DEFAULT_FORM }
    case 'flow_builder': return { type: 'flow_builder', flowId: '' }
    case 'pipeline': return { type: 'pipeline', pipelineId: '' }
  }
}

export function createTab(type: SimulationType): WorkspaceState {
  const state = loadWorkspace()
  const info = SIM_TYPES.find((s) => s.type === type)
  const now = new Date().toISOString()
  const tab: WorkspaceTab = {
    id: genId(),
    name: info?.label || type,
    simData: getDefaultData(type),
    createdAt: now,
    updatedAt: now,
  }
  return save({
    ...state,
    tabs: [...state.tabs, tab],
    activeTabId: tab.id,
  })
}

export function closeTab(tabId: string): WorkspaceState {
  const state = loadWorkspace()
  const remaining = state.tabs.filter((t) => t.id !== tabId)
  const wasActive = state.activeTabId === tabId
  return save({
    ...state,
    tabs: remaining,
    activeTabId: wasActive
      ? remaining[remaining.length - 1]?.id ?? null
      : state.activeTabId,
  })
}

export function setActiveTab(tabId: string): WorkspaceState {
  const state = loadWorkspace()
  return save({ ...state, activeTabId: tabId })
}

export function renameTab(tabId: string, name: string): WorkspaceState {
  const state = loadWorkspace()
  return save({
    ...state,
    tabs: state.tabs.map((t) =>
      t.id === tabId ? { ...t, name, updatedAt: new Date().toISOString() } : t
    ),
  })
}

export function updateTabData(tabId: string, simData: SimTabData): WorkspaceState {
  const state = loadWorkspace()
  return save({
    ...state,
    tabs: state.tabs.map((t) =>
      t.id === tabId ? { ...t, simData, updatedAt: new Date().toISOString() } : t
    ),
  })
}

export function duplicateTab(tabId: string): WorkspaceState {
  const state = loadWorkspace()
  const source = state.tabs.find((t) => t.id === tabId)
  if (!source) return state
  const now = new Date().toISOString()
  const copy: WorkspaceTab = {
    ...source,
    id: genId(),
    name: `${source.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  }
  return save({
    ...state,
    tabs: [...state.tabs, copy],
    activeTabId: copy.id,
  })
}

export function reorderTabs(tabIds: readonly string[]): WorkspaceState {
  const state = loadWorkspace()
  const tabMap = new Map(state.tabs.map((t) => [t.id, t]))
  const reordered = tabIds.map((id) => tabMap.get(id)).filter(Boolean) as WorkspaceTab[]
  return save({ ...state, tabs: reordered })
}
