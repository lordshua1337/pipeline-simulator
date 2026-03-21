'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
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
  const [simWarnings, setSimWarnings] = useState<string[]>([])
  const [showHelper, setShowHelper] = useState(false)
  const [activeDragType, setActiveDragType] = useState<FlowNodeType | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)

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

  // Connections handled inside FlowCanvas via portDown/portUp callbacks + bump-connect on drag end

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

  const handleInsertNode = useCallback((edgeId: string, position: { x: number; y: number }) => {
    const edge = flow.edges.find((e) => e.id === edgeId)
    if (!edge) return

    // Create new custom node at the midpoint
    const newNode: FlowNode = {
      id: generateFlowId('node'),
      type: 'custom',
      label: 'New Step',
      position,
      metrics: { ...DEFAULT_METRICS, conversionRate: 0.8 },
      config: {},
    }

    setFlow((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      // Remove old edge, add two new edges: source->new and new->target
      edges: [
        ...prev.edges.filter((e) => e.id !== edgeId),
        { id: generateFlowId('edge'), sourceId: edge.sourceId, targetId: newNode.id },
        { id: generateFlowId('edge'), sourceId: newNode.id, targetId: edge.targetId },
      ],
      updatedAt: new Date().toISOString(),
    }))
    setSelectedNodeId(newNode.id)
  }, [flow.edges])

  const handleDuplicateNode = useCallback((nodeId: string) => {
    const node = flow.nodes.find((n) => n.id === nodeId)
    if (!node) return
    const newNode: FlowNode = {
      ...node,
      id: generateFlowId('node'),
      label: `${node.label} (copy)`,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
    }
    setFlow((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      updatedAt: new Date().toISOString(),
    }))
    setSelectedNodeId(newNode.id)
  }, [flow.nodes])

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
    const warnings: string[] = []

    if (flow.nodes.length === 0) {
      warnings.push('Add at least one node to the canvas to simulate.')
      setSimWarnings(warnings)
      setShowHelper(true)
      return
    }

    // Check for traffic sources (root nodes with traffic)
    const hasTraffic = flow.nodes.some((n) => n.type === 'traffic_source' && n.metrics.trafficVolume > 0)
    if (!hasTraffic) {
      warnings.push('No traffic source with volume > 0. Add a Traffic Source node and set its traffic volume.')
    }

    // Check for disconnected nodes
    const connectedIds = new Set<string>()
    for (const e of flow.edges) {
      connectedIds.add(e.sourceId)
      connectedIds.add(e.targetId)
    }
    const disconnected = flow.nodes.filter((n) => !connectedIds.has(n.id))
    if (disconnected.length > 0 && flow.nodes.length > 1) {
      warnings.push(`${disconnected.length} node${disconnected.length > 1 ? 's are' : ' is'} not connected: ${disconnected.map((n) => n.label).join(', ')}`)
    }

    // Check for revenue nodes
    const hasRevenue = flow.nodes.some((n) => n.metrics.revenuePerSale > 0)
    if (!hasRevenue) {
      warnings.push('No node has revenue set. Set "Revenue Per Sale" on at least one node (usually Checkout or Upsell).')
    }

    // Check for zero conversion rates
    const zeroConv = flow.nodes.filter((n) => n.metrics.conversionRate === 0 && n.type !== 'traffic_source')
    if (zeroConv.length > 0) {
      warnings.push(`${zeroConv.length} node${zeroConv.length > 1 ? 's have' : ' has'} 0% conversion: ${zeroConv.map((n) => n.label).join(', ')}`)
    }

    if (warnings.length > 0) {
      setSimWarnings(warnings)
      setShowHelper(true)
    } else {
      setShowHelper(false)
      setSimWarnings([])
    }

    // Run simulation even with warnings (but show them)
    setIsSimulating(true)
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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.type === 'palette-item') {
      setActiveDragType(data.nodeType as FlowNodeType)
    }
  }, [])

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
          const newPos = {
            x: Math.round(node.position.x + delta.x),
            y: Math.round(node.position.y + delta.y),
          }
          handleMoveNode(nodeId, newPos)

          // BUMP-CONNECT: check if this node landed near another node's port
          const BW = 200
          const BH = 100
          const BUMP_THRESHOLD = 50

          const draggedPorts = [
            { x: newPos.x + BW / 2, y: newPos.y, side: 'top' },
            { x: newPos.x + BW, y: newPos.y + BH / 2, side: 'right' },
            { x: newPos.x + BW / 2, y: newPos.y + BH, side: 'bottom' },
            { x: newPos.x, y: newPos.y + BH / 2, side: 'left' },
          ]

          for (const other of flow.nodes) {
            if (other.id === nodeId) continue

            const otherPorts = [
              { x: other.position.x + BW / 2, y: other.position.y },
              { x: other.position.x + BW, y: other.position.y + BH / 2 },
              { x: other.position.x + BW / 2, y: other.position.y + BH },
              { x: other.position.x, y: other.position.y + BH / 2 },
            ]

            for (const dp of draggedPorts) {
              for (const op of otherPorts) {
                const dist = Math.hypot(dp.x - op.x, dp.y - op.y)
                if (dist < BUMP_THRESHOLD) {
                  // Check no existing edge between these two
                  const alreadyConnected = flow.edges.some(
                    (e) => (e.sourceId === nodeId && e.targetId === other.id) ||
                           (e.sourceId === other.id && e.targetId === nodeId)
                  )
                  if (!alreadyConnected) {
                    // Determine direction: dragged node's right/bottom = source, left/top = target
                    const isSource = dp.side === 'right' || dp.side === 'bottom'
                    handleAddEdge({
                      id: generateFlowId('edge'),
                      sourceId: isSource ? nodeId : other.id,
                      targetId: isSource ? other.id : nodeId,
                    })
                    return // only one bump-connect per drag
                  }
                }
              }
            }
          }
        }
      }
    },
    [flow.nodes, flow.edges, handleAddNode, handleMoveNode, handleAddEdge]
  )

  const dragOverlayMeta = activeDragType ? NODE_TYPE_META[activeDragType] : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={(e) => { handleDragEnd(e); setActiveDragType(null) }}>
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

      {/* Simulation helper */}
      {showHelper && simWarnings.length > 0 && (
        <div className="px-4 py-2 flex items-start gap-3" style={{ background: '#FEF3C7', borderBottom: '1px solid #FDE68A' }}>
          <span className="text-amber-600 text-sm mt-0.5">!</span>
          <div className="flex-1">
            <div className="text-xs font-medium text-amber-800 mb-1">Simulation ran with issues:</div>
            <div className="space-y-0.5">
              {simWarnings.map((w, i) => (
                <div key={i} className="text-[11px] text-amber-700">{w}</div>
              ))}
            </div>
          </div>
          <button onClick={() => setShowHelper(false)} className="text-amber-400 hover:text-amber-600 text-xs mt-0.5">
            Dismiss
          </button>
        </div>
      )}

      {/* Click-away for templates */}
      {showTemplates && (
        <div className="fixed inset-0 z-10" onClick={() => setShowTemplates(false)} />
      )}

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <NodePalette />

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
          onDuplicateNode={handleDuplicateNode}
          onInsertNode={handleInsertNode}
          connectingFrom={connectingFrom}
          onSetConnectingFrom={setConnectingFrom}
          externalMousePos={null}
          trafficMap={trafficMap}
        />

        {/* Right panel: config when node selected, results when simulation run */}
        {selectedNode ? (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={handleUpdateNode}
            onDelete={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
          />
        ) : simResult ? (
          <FlowResults
            result={simResult}
            monteCarlo={mcResult}
            onClose={() => {
              setSimResult(null)
              setMcResult(null)
            }}
          />
        ) : null}
      </div>
    </div>

    <DragOverlay dropAnimation={null}>
      {dragOverlayMeta && (
        <div className="w-[180px] bg-white rounded-xl border-2 border-blue-400 shadow-xl px-3 py-2 flex items-center gap-2 opacity-90">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ backgroundColor: dragOverlayMeta.color }}
          >
            <span className="text-white text-[10px] font-bold">{dragOverlayMeta.label[0]}</span>
          </div>
          <span className="text-xs font-semibold text-gray-900">{dragOverlayMeta.label}</span>
        </div>
      )}
    </DragOverlay>
    </DndContext>
  )
}
