'use client'

import type { FlowNode, FlowEdge } from '@/lib/flow-types'

const NODE_W = 200
const NODE_H = 80

interface FlowEdgeLayerProps {
  nodes: readonly FlowNode[]
  edges: readonly FlowEdge[]
  selectedEdgeId: string | null
  onSelectEdge: (id: string | null) => void
  connectingFrom: string | null
  mousePos: { x: number; y: number } | null
}

function getPortPos(node: FlowNode, side: 'input' | 'output') {
  return {
    x: side === 'output' ? node.position.x + NODE_W : node.position.x,
    y: node.position.y + NODE_H / 2,
  }
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1) * 0.5
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
}

export function FlowEdgeLayer({
  nodes,
  edges,
  selectedEdgeId,
  onSelectEdge,
  connectingFrom,
  mousePos,
}: FlowEdgeLayerProps) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
      {edges.map((edge) => {
        const source = nodeMap.get(edge.sourceId)
        const target = nodeMap.get(edge.targetId)
        if (!source || !target) return null

        const from = getPortPos(source, 'output')
        const to = getPortPos(target, 'input')
        const path = bezierPath(from.x, from.y, to.x, to.y)
        const isSelected = selectedEdgeId === edge.id

        // Midpoint for label
        const mx = (from.x + to.x) / 2
        const my = (from.y + to.y) / 2

        return (
          <g key={edge.id}>
            {/* Hit area (wider, invisible) */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              className="pointer-events-auto cursor-pointer"
              onClick={() => onSelectEdge(edge.id)}
            />
            {/* Visible edge */}
            <path
              d={path}
              fill="none"
              stroke={isSelected ? '#3B82F6' : '#CBD5E1'}
              strokeWidth={isSelected ? 2.5 : 2}
              strokeDasharray={isSelected ? 'none' : 'none'}
              className="transition-colors"
            />
            {/* Arrow */}
            <circle cx={to.x - 6} cy={to.y} r={3} fill={isSelected ? '#3B82F6' : '#94A3B8'} />
            {/* Label */}
            {edge.label && (
              <g>
                <rect x={mx - 20} y={my - 10} width={40} height={20} rx={6} fill="white" stroke="#E2E8F0" strokeWidth={1} />
                <text x={mx} y={my + 4} textAnchor="middle" className="text-[9px] fill-gray-500 font-mono">
                  {edge.label}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* Temporary connection line while dragging from a port */}
      {connectingFrom && mousePos && (() => {
        const source = nodeMap.get(connectingFrom)
        if (!source) return null
        const from = getPortPos(source, 'output')
        const path = bezierPath(from.x, from.y, mousePos.x, mousePos.y)
        return (
          <path
            d={path}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={2}
            strokeDasharray="6 4"
            opacity={0.6}
          />
        )
      })()}
    </svg>
  )
}
