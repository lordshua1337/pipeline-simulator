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
  onSelectNode: (id: string | null) => void
  onSelectEdge: (id: string | null) => void
  onAddNode: (node: FlowNode) => void
  onMoveNode: (nodeId: string, position: { x: number; y: number }) => void
  onAddEdge: (edge: FlowEdge) => void
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

  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const { setNodeRef: setDropRef } = useDroppable({ id: 'flow-canvas' })

  // Edge creation via port clicking
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      const port = target.closest('[data-port]') as HTMLElement | null

      if (port) {
        const nodeId = port.dataset.nodeId

        if (nodeId && !connectingFrom) {
          // Start a new connection from this port
          setConnectingFrom(nodeId)
          e.stopPropagation()
          return
        }

        if (nodeId && connectingFrom) {
          // Complete the connection
          if (connectingFrom !== nodeId) {
            const edgeExists = edges.some(
              (edge) =>
                (edge.sourceId === connectingFrom && edge.targetId === nodeId) ||
                (edge.sourceId === nodeId && edge.targetId === connectingFrom)
            )
            if (!edgeExists) {
              onAddEdge({
                id: generateFlowId('edge'),
                sourceId: connectingFrom,
                targetId: nodeId,
              })
            }
          }
          setConnectingFrom(null)
          setMousePos(null)
          e.stopPropagation()
          return
        }
      }

      // Click on empty canvas -- deselect
      if (!port) {
        onSelectNode(null)
        onSelectEdge(null)
        setConnectingFrom(null)
        setMousePos(null)
      }

      startPan(e)
    },
    [connectingFrom, edges, onAddEdge, onSelectNode, onSelectEdge, startPan]
  )

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (connectingFrom && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const pos = screenToCanvas(e.clientX, e.clientY, rect)
        setMousePos(pos)
      }
      onPanMove(e)
    },
    [connectingFrom, screenToCanvas, onPanMove]
  )

  const handleCanvasMouseUp = useCallback(() => {
    if (connectingFrom) {
      // Dropped on empty space -- cancel connection
      setConnectingFrom(null)
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
        className="flex-1 overflow-hidden relative bg-[#FAFAFA] cursor-default"
        style={{
          backgroundImage: 'radial-gradient(circle, #E5E7EB 1px, transparent 1px)',
          backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
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
            connectingFrom={connectingFrom}
            mousePos={mousePos}
          />

          {nodes.map((node) => (
            <BaseFlowNode
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              onSelect={onSelectNode}
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
