'use client'

import { useState, useCallback, useRef } from 'react'
import {
  useDroppable,
} from '@dnd-kit/core'
import type { FlowNode, FlowEdge, FlowNodeType } from '@/lib/flow-types'
import { NODE_TYPE_META, DEFAULT_METRICS } from '@/lib/flow-types'
import { useCanvasViewport } from '@/lib/hooks/useCanvasViewport'
import { BaseFlowNode } from './nodes/BaseFlowNode'
import { FlowEdgeLayer } from './FlowEdgeLayer'
import { generateFlowId } from '@/lib/flow-state'

interface FlowCanvasProps {
  nodes: readonly FlowNode[]
  edges: readonly FlowEdge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  connectingFrom: string | null
  onSetConnectingFrom: (nodeId: string | null) => void
  onSelectNode: (id: string | null) => void
  onSelectEdge: (id: string | null) => void
  onAddNode: (node: FlowNode) => void
  onMoveNode: (nodeId: string, position: { x: number; y: number }) => void
  onAddEdge: (edge: FlowEdge) => void
  onDuplicateNode: (nodeId: string) => void
  onInsertNode: (edgeId: string, position: { x: number; y: number }) => void
  externalMousePos?: { x: number; y: number } | null
  trafficMap?: Map<string, number>
}

export function FlowCanvas({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onAddNode,
  onMoveNode,
  onAddEdge,
  onDuplicateNode,
  onInsertNode,
  connectingFrom,
  onSetConnectingFrom,
  externalMousePos,
  trafficMap,
}: FlowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const {
    viewport,
    handleWheel,
    startPan,
    onPanMove,
    endPan,
    screenToCanvas,
    zoomIn,
    zoomOut,
    fitToContent,
  } = useCanvasViewport()

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const { setNodeRef: setDropRef } = useDroppable({ id: 'flow-canvas' })

  // Simple port click: first click = start, second click = finish
  const handlePortClick = useCallback((nodeId: string) => {
    if (!connectingFrom) {
      // Start connection
      onSetConnectingFrom(nodeId)
    } else if (connectingFrom === nodeId) {
      // Clicked same node, cancel
      onSetConnectingFrom(null)
      setMousePos(null)
    } else {
      // Different node, create edge
      const exists = edges.some(
        (e) => (e.sourceId === connectingFrom && e.targetId === nodeId) ||
               (e.sourceId === nodeId && e.targetId === connectingFrom)
      )
      if (!exists) {
        onAddEdge({ id: generateFlowId('edge'), sourceId: connectingFrom, targetId: nodeId })
      }
      onSetConnectingFrom(null)
      setMousePos(null)
    }
  }, [connectingFrom, edges, onAddEdge, onSetConnectingFrom])

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Click on empty canvas -- deselect and cancel connection
      onSelectNode(null)
      onSelectEdge(null)
      if (connectingFrom) {
        onSetConnectingFrom(null)
        setMousePos(null)
      }
      startPan(e)
    },
    [connectingFrom, onSelectNode, onSelectEdge, onSetConnectingFrom, startPan]
  )

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const pos = screenToCanvas(e.clientX, e.clientY, rect)
        setMousePos(pos)
      }
      onPanMove(e as unknown as React.MouseEvent)
    },
    [screenToCanvas, onPanMove]
  )

  const handleCanvasMouseUp = useCallback(() => {
    if (connectingFrom) {
      // Dropped on empty space -- cancel connection
      onSetConnectingFrom(null)
      setMousePos(null)
    }
    endPan()
  }, [connectingFrom, endPan])

  return (
      <div
        ref={(el) => {
          setDropRef(el)
          ;(canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = el
        }}
        data-flow-canvas
        className="flex-1 overflow-hidden relative bg-[#FAFAFA] cursor-default"
        style={{
          backgroundImage: 'radial-gradient(circle, #E5E7EB 1px, transparent 1px)',
          backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onPointerMove={handleCanvasPointerMove}
        onMouseUp={handleCanvasMouseUp}
      >
        {/* Transformed layer */}
        <div
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          <FlowEdgeLayer
            nodes={nodes}
            edges={edges}
            selectedEdgeId={selectedEdgeId}
            onSelectEdge={onSelectEdge}
            onInsertNode={onInsertNode}
            connectingFrom={connectingFrom}
            mousePos={externalMousePos || mousePos}
          />

          {nodes.map((node) => (
            <BaseFlowNode
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              onSelect={onSelectNode}
              onDuplicate={onDuplicateNode}
              onPortClick={handlePortClick}
              isConnecting={!!connectingFrom}
              computedTraffic={trafficMap?.get(node.id)}
            />
          ))}
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm p-1">
          <button onClick={zoomOut} className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600 text-sm font-medium">
            -
          </button>
          <span className="text-[10px] font-mono text-gray-500 w-10 text-center">
            {Math.round(viewport.zoom * 100)}%
          </span>
          <button onClick={zoomIn} className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600 text-sm font-medium">
            +
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <button
            onClick={() => {
              if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect()
                fitToContent(nodes, rect.width, rect.height)
              }
            }}
            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600 text-[10px] font-medium"
            title="Fit to content"
          >
            Fit
          </button>
        </div>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-sm text-gray-400 font-medium">Drag components from the left panel</p>
              <p className="text-xs text-gray-300 mt-1">or load a template from the toolbar</p>
            </div>
          </div>
        )}
      </div>
  )
}
