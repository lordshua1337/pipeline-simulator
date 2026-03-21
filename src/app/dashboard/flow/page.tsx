'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  ArrowLeft, Save, Play, RotateCcw, Layout, Loader2,
  ChevronDown,
} from 'lucide-react'
import { FlowCanvas } from '@/components/flow/FlowCanvas'
import { NodePalette } from '@/components/flow/NodePalette'
import { NodeConfigPanel } from '@/components/flow/NodeConfigPanel'
import { FlowResults } from '@/components/flow/FlowResults'
import type { FlowDocument, FlowNode, FlowEdge, FlowNodeType, FlowSimulationResult, FlowMonteCarloResult } from '@/lib/flow-types'
import { NODE_TYPE_META, DEFAULT_METRICS } from '@/lib/flow-types'
import {
  generateFlowId,
  createFlow,
  updateFlow,
  getFlow,
} from '@/lib/flow-state'
import { flowTemplates } from '@/lib/flow-templates'
import { simulateFlow, monteCarloFlow } from '@/lib/services/flow-simulation'

function createEmptyFlow(): FlowDocument {
  const now = new Date().toISOString()
  return {
    id: generateFlowId(),
    name: 'Untitled Flow',
    description: null,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: now,
    updatedAt: now,
  }
}

function loadTemplateAsFlow(templateId: string): FlowDocument {
  const template = flowTemplates.find((t) => t.id === templateId)
  if (!template) return createEmptyFlow()

  const now = new Date().toISOString()

  // Generate IDs for nodes
  const nodeIds = template.nodes.map(() => generateFlowId('node'))
  const nodes: FlowNode[] = template.nodes.map((n, i) => ({
    ...n,
    id: nodeIds[i],
  }))

  // Map edge indices to actual node IDs
  const edges: FlowEdge[] = template.edges.map((e) => ({
    id: generateFlowId('edge'),
    sourceId: nodeIds[e.sourceIndex],
    targetId: nodeIds[e.targetIndex],
    label: e.label,
    splitPercentage: e.splitPercentage,
  }))

  return {
    id: generateFlowId(),
    name: template.name,
    description: template.description,
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: now,
    updatedAt: now,
  }
}

export default function FlowBuilderPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [flow, setFlow] = useState<FlowDocument>(createEmptyFlow)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [simResult, setSimResult] = useState<FlowSimulationResult | null>(null)
  const [mcResult, setMcResult] = useState<FlowMonteCarloResult | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [editingName, setEditingName] = useState(false)

  const selectedNode = useMemo(
    () => flow.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [flow.nodes, selectedNodeId]
  )

  // Traffic map from simulation results
  const trafficMap = useMemo(() => {
    if (!simResult) return undefined
    const map = new Map<string, number>()
    for (const nr of simResult.perNodeResults) {
      map.set(nr.nodeId, nr.trafficIn)
    }
    return map
  }, [simResult])

  const handleAddNode = useCallback((node: FlowNode) => {
    setFlow((prev) => ({
      ...prev,
      nodes: [...prev.nodes, node],
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const handleMoveNode = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setFlow((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const handleAddEdge = useCallback((edge: FlowEdge) => {
    setFlow((prev) => ({
      ...prev,
      edges: [...prev.edges, edge],
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const handleUpdateNode = useCallback((nodeId: string, updates: Partial<FlowNode>) => {
    setFlow((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const handleDeleteNode = useCallback((nodeId: string) => {
    setFlow((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      edges: prev.edges.filter((e) => e.sourceId !== nodeId && e.targetId !== nodeId),
      updatedAt: new Date().toISOString(),
    }))
    setSelectedNodeId(null)
  }, [])

  const handleSave = useCallback(() => {
    const existing = getFlow(flow.id)
    if (existing) {
      updateFlow(flow.id, flow)
    } else {
      createFlow(flow)
    }
  }, [flow])

  const handleRunSimulation = useCallback(() => {
    if (flow.nodes.length === 0) return
    setIsSimulating(true)

    // Run in next tick to allow UI to update
    setTimeout(() => {
      const result = simulateFlow(flow)
      setSimResult(result)

      const mc = monteCarloFlow(flow, 1000)
      setMcResult(mc)

      setIsSimulating(false)
    }, 50)
  }, [flow])

  const handleLoadTemplate = useCallback((templateId: string) => {
    const newFlow = loadTemplateAsFlow(templateId)
    setFlow(newFlow)
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setSimResult(null)
    setMcResult(null)
    setShowTemplates(false)
  }, [])

  const handleReset = useCallback(() => {
    setFlow(createEmptyFlow())
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setSimResult(null)
    setMcResult(null)
  }, [])

  // DnD sensors and handler -- must be at page level to wrap both palette and canvas
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event
      const data = active.data.current
      if (!data) return

      if (data.type === 'palette-item') {
        // Dropped from palette -- create new node at center of canvas
        const nodeType = data.nodeType as FlowNodeType
        const meta = NODE_TYPE_META[nodeType]

        // Place at approximate center or use activator position
        const activatorEvent = event.activatorEvent as MouseEvent
        const dropX = activatorEvent.clientX + delta.x - 300 // offset for palette width + margin
        const dropY = activatorEvent.clientY + delta.y - 60  // offset for toolbar

        const newNode: FlowNode = {
          id: generateFlowId('node'),
          type: nodeType,
          label: meta.label,
          position: { x: Math.max(0, dropX), y: Math.max(0, dropY) },
          metrics: { ...DEFAULT_METRICS, ...meta.defaultMetrics },
          config: {},
        }

        handleAddNode(newNode)
        setSelectedNodeId(newNode.id)
      } else if (data.type === 'canvas-node') {
        // Repositioning existing node on canvas
        const nodeId = data.nodeId as string
        const node = flow.nodes.find((n) => n.id === nodeId)
        if (node) {
          handleMoveNode(nodeId, {
            x: Math.round(node.position.x + delta.x),
            y: Math.round(node.position.y + delta.y),
          })
        }
      }
    },
    [flow.nodes, handleAddNode, handleMoveNode]
  )

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
    <div className="h-screen flex flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200 bg-white flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <div className="w-px h-5 bg-gray-200" />
          {editingName ? (
            <input
              autoFocus
              value={flow.name}
              onChange={(e) => setFlow((prev) => ({ ...prev, name: e.target.value }))}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              className="text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              {flow.name}
            </button>
          )}
          <span className="text-[10px] text-gray-400">
            {flow.nodes.length} nodes / {flow.edges.length} edges
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Templates dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Layout className="w-3.5 h-3.5" />
              Templates
              <ChevronDown className="w-3 h-3" />
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-9 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1">
                {flowTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleLoadTemplate(t.id)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-xs font-medium text-gray-900">{t.name}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{t.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>

          <button
            onClick={handleRunSimulation}
            disabled={isSimulating || flow.nodes.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSimulating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {isSimulating ? 'Running...' : 'Simulate'}
          </button>
        </div>
      </div>

      {/* Click-away for templates */}
      {showTemplates && (
        <div className="fixed inset-0 z-10" onClick={() => setShowTemplates(false)} />
      )}

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <NodePalette />

        <div className="flex-1 flex flex-col overflow-hidden">
          <FlowCanvas
            nodes={flow.nodes}
            edges={flow.edges}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onSelectNode={setSelectedNodeId}
            onSelectEdge={setSelectedEdgeId}
            onAddNode={handleAddNode}
            onMoveNode={handleMoveNode}
            onAddEdge={handleAddEdge}
            trafficMap={trafficMap}
          />

          <FlowResults
            result={simResult}
            monteCarlo={mcResult}
            onClose={() => {
              setSimResult(null)
              setMcResult(null)
            }}
          />
        </div>

        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={handleUpdateNode}
            onDelete={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
    </DndContext>
  )
}
