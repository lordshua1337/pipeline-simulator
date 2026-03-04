// Pipeline Simulator -- localStorage State Management

import type { Pipeline, Stage, Item, StageHistory } from './types'

const STORAGE_KEY = 'pipeline-simulator-state'

export interface AppState {
  readonly pipelines: readonly Pipeline[]
  readonly stages: readonly Stage[]
  readonly items: readonly Item[]
  readonly history: readonly StageHistory[]
}

const DEFAULT_STATE: AppState = {
  pipelines: [],
  stages: [],
  items: [],
  history: [],
}

let counter = 0
export function generateId(prefix: string = 'id'): string {
  counter += 1
  return `${prefix}-${Date.now()}-${counter}`
}

export function loadState(): AppState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    return JSON.parse(raw) as AppState
  } catch {
    return DEFAULT_STATE
  }
}

function saveState(state: AppState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// Pipeline CRUD

export function createPipeline(pipeline: Pipeline): AppState {
  const state = loadState()
  const next = { ...state, pipelines: [...state.pipelines, pipeline] }
  saveState(next)
  return next
}

export function updatePipeline(
  id: string,
  updates: Partial<Pipeline>
): AppState {
  const state = loadState()
  const next = {
    ...state,
    pipelines: state.pipelines.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    ),
  }
  saveState(next)
  return next
}

export function deletePipeline(id: string): AppState {
  const state = loadState()
  const next = {
    ...state,
    pipelines: state.pipelines.filter((p) => p.id !== id),
    stages: state.stages.filter((s) => s.pipelineId !== id),
    items: state.items.filter((i) => i.pipelineId !== id),
    history: state.history.filter((h) => {
      const item = state.items.find((i) => i.id === h.itemId)
      return item ? item.pipelineId !== id : true
    }),
  }
  saveState(next)
  return next
}

// Stage CRUD

export function addStages(stages: readonly Stage[]): AppState {
  const state = loadState()
  const next = { ...state, stages: [...state.stages, ...stages] }
  saveState(next)
  return next
}

export function updateStage(id: string, updates: Partial<Stage>): AppState {
  const state = loadState()
  const next = {
    ...state,
    stages: state.stages.map((s) => (s.id === id ? { ...s, ...updates } : s)),
  }
  saveState(next)
  return next
}

export function reorderStages(
  pipelineId: string,
  orderedIds: readonly string[]
): AppState {
  const state = loadState()
  const next = {
    ...state,
    stages: state.stages.map((s) => {
      if (s.pipelineId !== pipelineId) return s
      const idx = orderedIds.indexOf(s.id)
      return idx >= 0 ? { ...s, position: idx + 1 } : s
    }),
  }
  saveState(next)
  return next
}

export function deleteStage(id: string): AppState {
  const state = loadState()
  const stage = state.stages.find((s) => s.id === id)
  if (!stage) return state

  // Find previous stage to move items to
  const pipelineStages = state.stages
    .filter((s) => s.pipelineId === stage.pipelineId)
    .sort((a, b) => a.position - b.position)

  const idx = pipelineStages.findIndex((s) => s.id === id)
  const prevStage = idx > 0 ? pipelineStages[idx - 1] : null

  const next = {
    ...state,
    stages: state.stages.filter((s) => s.id !== id),
    items: state.items.map((i) => {
      if (i.stageId !== id) return i
      return prevStage ? { ...i, stageId: prevStage.id } : i
    }),
  }
  saveState(next)
  return next
}

// Item CRUD

export function addItems(items: readonly Item[]): AppState {
  const state = loadState()
  const next = { ...state, items: [...state.items, ...items] }
  saveState(next)
  return next
}

export function moveItem(
  itemId: string,
  toStageId: string
): AppState {
  const state = loadState()
  const item = state.items.find((i) => i.id === itemId)
  if (!item) return state

  const now = new Date().toISOString()
  const timeInStage = item.enteredAt
    ? Math.floor(
        (new Date().getTime() - new Date(item.enteredAt).getTime()) / 1000
      )
    : 0

  const historyEntry: StageHistory = {
    id: generateId('hist'),
    itemId,
    fromStageId: item.stageId,
    toStageId,
    timeInStageSeconds: timeInStage,
    movedAt: now,
  }

  const next = {
    ...state,
    items: state.items.map((i) =>
      i.id === itemId
        ? { ...i, stageId: toStageId, enteredAt: now, updatedAt: now }
        : i
    ),
    history: [...state.history, historyEntry],
  }
  saveState(next)
  return next
}

export function updateItem(id: string, updates: Partial<Item>): AppState {
  const state = loadState()
  const next = {
    ...state,
    items: state.items.map((i) =>
      i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
    ),
  }
  saveState(next)
  return next
}

export function deleteItem(id: string): AppState {
  const state = loadState()
  const next = {
    ...state,
    items: state.items.filter((i) => i.id !== id),
    history: state.history.filter((h) => h.itemId !== id),
  }
  saveState(next)
  return next
}

export function clearSampleItems(pipelineId: string): AppState {
  const state = loadState()
  const sampleIds = state.items
    .filter((i) => i.pipelineId === pipelineId && i.isSample)
    .map((i) => i.id)

  const next = {
    ...state,
    items: state.items.filter((i) => !sampleIds.includes(i.id)),
    history: state.history.filter((h) => !sampleIds.includes(h.itemId)),
  }
  saveState(next)
  return next
}

// Query helpers

export function getPipelineStages(
  state: AppState,
  pipelineId: string
): readonly Stage[] {
  return state.stages
    .filter((s) => s.pipelineId === pipelineId)
    .sort((a, b) => a.position - b.position)
}

export function getStageItems(
  state: AppState,
  stageId: string
): readonly Item[] {
  return state.items.filter((i) => i.stageId === stageId)
}

export function getPipelineItems(
  state: AppState,
  pipelineId: string
): readonly Item[] {
  return state.items.filter((i) => i.pipelineId === pipelineId)
}

export function getItemHistory(
  state: AppState,
  itemId: string
): readonly StageHistory[] {
  return state.history
    .filter((h) => h.itemId === itemId)
    .sort((a, b) => new Date(a.movedAt).getTime() - new Date(b.movedAt).getTime())
}

export function getPipelineHistory(
  state: AppState,
  pipelineId: string
): readonly StageHistory[] {
  const itemIds = new Set(
    state.items.filter((i) => i.pipelineId === pipelineId).map((i) => i.id)
  )
  return state.history.filter((h) => itemIds.has(h.itemId))
}
