// Flow Builder -- localStorage State Management

import type { FlowDocument, FlowNode, FlowEdge, FlowViewport } from './flow-types'

const STORAGE_KEY = 'pipeline-flow-state'

export interface FlowState {
  readonly flows: readonly FlowDocument[]
}

const DEFAULT_STATE: FlowState = { flows: [] }

let counter = 0
export function generateFlowId(prefix: string = 'flow'): string {
  counter += 1
  return `${prefix}-${Date.now()}-${counter}`
}

export function loadFlowState(): FlowState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    return JSON.parse(raw) as FlowState
  } catch {
    return DEFAULT_STATE
  }
}

function save(state: FlowState): FlowState {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
  return state
}

export function createFlow(flow: FlowDocument): FlowState {
  const state = loadFlowState()
  return save({ ...state, flows: [...state.flows, flow] })
}

export function updateFlow(id: string, updates: Partial<FlowDocument>): FlowState {
  const state = loadFlowState()
  return save({
    ...state,
    flows: state.flows.map((f) =>
      f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f
    ),
  })
}

export function deleteFlow(id: string): FlowState {
  const state = loadFlowState()
  return save({ ...state, flows: state.flows.filter((f) => f.id !== id) })
}

export function getFlow(id: string): FlowDocument | undefined {
  return loadFlowState().flows.find((f) => f.id === id)
}

export function addNode(flowId: string, node: FlowNode): FlowState {
  const state = loadFlowState()
  return save({
    ...state,
    flows: state.flows.map((f) =>
      f.id === flowId
        ? { ...f, nodes: [...f.nodes, node], updatedAt: new Date().toISOString() }
        : f
    ),
  })
}

export function updateNode(flowId: string, nodeId: string, updates: Partial<FlowNode>): FlowState {
  const state = loadFlowState()
  return save({
    ...state,
    flows: state.flows.map((f) =>
      f.id === flowId
        ? {
            ...f,
            nodes: f.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
            updatedAt: new Date().toISOString(),
          }
        : f
    ),
  })
}

export function moveNode(flowId: string, nodeId: string, position: { x: number; y: number }): FlowState {
  return updateNode(flowId, nodeId, { position })
}

export function removeNode(flowId: string, nodeId: string): FlowState {
  const state = loadFlowState()
  return save({
    ...state,
    flows: state.flows.map((f) =>
      f.id === flowId
        ? {
            ...f,
            nodes: f.nodes.filter((n) => n.id !== nodeId),
            edges: f.edges.filter((e) => e.sourceId !== nodeId && e.targetId !== nodeId),
            updatedAt: new Date().toISOString(),
          }
        : f
    ),
  })
}

export function addEdge(flowId: string, edge: FlowEdge): FlowState {
  const state = loadFlowState()
  return save({
    ...state,
    flows: state.flows.map((f) =>
      f.id === flowId
        ? { ...f, edges: [...f.edges, edge], updatedAt: new Date().toISOString() }
        : f
    ),
  })
}

export function removeEdge(flowId: string, edgeId: string): FlowState {
  const state = loadFlowState()
  return save({
    ...state,
    flows: state.flows.map((f) =>
      f.id === flowId
        ? { ...f, edges: f.edges.filter((e) => e.id !== edgeId), updatedAt: new Date().toISOString() }
        : f
    ),
  })
}

export function updateViewport(flowId: string, viewport: FlowViewport): FlowState {
  return updateFlow(flowId, { viewport })
}

export function duplicateFlow(flowId: string): FlowState {
  const flow = getFlow(flowId)
  if (!flow) return loadFlowState()
  const now = new Date().toISOString()
  const newFlow: FlowDocument = {
    ...flow,
    id: generateFlowId(),
    name: `${flow.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  }
  return createFlow(newFlow)
}
