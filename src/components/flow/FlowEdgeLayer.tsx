'use client'

import type { FlowNode, FlowEdge } from '@/lib/flow-types'

const NODE_W = 200
const NODE_H = 90

type Side = 'top' | 'right' | 'bottom' | 'left'

interface Port {
  x: number
  y: number
  side: Side
}

// Get all 4 port positions for a node
function getNodePorts(node: FlowNode): Record<Side, Port> {
  const cx = node.position.x + NODE_W / 2
  const cy = node.position.y + NODE_H / 2
  return {
    top:    { x: cx, y: node.position.y, side: 'top' },
    right:  { x: node.position.x + NODE_W, y: cy, side: 'right' },
    bottom: { x: cx, y: node.position.y + NODE_H, side: 'bottom' },
    left:   { x: node.position.x, y: cy, side: 'left' },
  }
}

// Pick the best pair of ports between two nodes based on their relative position
function getBestPorts(source: FlowNode, target: FlowNode): { from: Port; to: Port } {
  const sPorts = getNodePorts(source)
  const tPorts = getNodePorts(target)

  const dx = target.position.x - source.position.x
  const dy = target.position.y - source.position.y

  // Determine primary direction
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (absDx > absDy) {
    // Horizontal -- use right/left
    if (dx > 0) return { from: sPorts.right, to: tPorts.left }
    return { from: sPorts.left, to: tPorts.right }
  } else {
    // Vertical -- use bottom/top
    if (dy > 0) return { from: sPorts.bottom, to: tPorts.top }
    return { from: sPorts.top, to: tPorts.bottom }
  }
}

function bezierPath(from: Port, to: Port): string {
  const isHorizontal = from.side === 'left' || from.side === 'right'

  if (isHorizontal) {
    const dx = Math.abs(to.x - from.x) * 0.4
    const cx1 = from.side === 'right' ? from.x + dx : from.x - dx
    const cx2 = to.side === 'left' ? to.x - dx : to.x + dx
    return `M ${from.x} ${from.y} C ${cx1} ${from.y}, ${cx2} ${to.y}, ${to.x} ${to.y}`
  } else {
    const dy = Math.abs(to.y - from.y) * 0.4
    const cy1 = from.side === 'bottom' ? from.y + dy : from.y - dy
    const cy2 = to.side === 'top' ? to.y - dy : to.y + dy
    return `M ${from.x} ${from.y} C ${from.x} ${cy1}, ${to.x} ${cy2}, ${to.x} ${to.y}`
  }
}

// Arrow marker pointing in the direction the edge enters the target port
function arrowPoints(to: Port, size: number = 6): string {
  switch (to.side) {
    case 'left':  return `${to.x + size},${to.y - size / 2} ${to.x},${to.y} ${to.x + size},${to.y + size / 2}`
    case 'right': return `${to.x - size},${to.y - size / 2} ${to.x},${to.y} ${to.x - size},${to.y + size / 2}`
    case 'top':   return `${to.x - size / 2},${to.y + size} ${to.x},${to.y} ${to.x + size / 2},${to.y + size}`
    case 'bottom': return `${to.x - size / 2},${to.y - size} ${to.x},${to.y} ${to.x + size / 2},${to.y - size}`
  }
}

interface FlowEdgeLayerProps {
  nodes: readonly FlowNode[]
  edges: readonly FlowEdge[]
  selectedEdgeId: string | null
  onSelectEdge: (id: string | null) => void
  connectingFrom: string | null
  mousePos: { x: number; y: number } | null
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

        const { from, to } = getBestPorts(source, target)
        const path = bezierPath(from, to)
        const isSelected = selectedEdgeId === edge.id

        const mx = (from.x + to.x) / 2
        const my = (from.y + to.y) / 2

        return (
          <g key={edge.id}>
            {/* Hit area */}
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
              strokeWidth={isSelected ? 2.5 : 1.5}
              className="transition-colors"
            />
            {/* Arrow */}
            <polygon
              points={arrowPoints(to)}
              fill={isSelected ? '#3B82F6' : '#94A3B8'}
            />
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

      {/* Temporary connection line */}
      {connectingFrom && mousePos && (() => {
        const source = nodeMap.get(connectingFrom)
        if (!source) return null
        const ports = getNodePorts(source)
        // Pick the port closest to the mouse
        let bestPort = ports.right
        let bestDist = Infinity
        for (const port of Object.values(ports)) {
          const d = Math.hypot(mousePos.x - port.x, mousePos.y - port.y)
          if (d < bestDist) { bestDist = d; bestPort = port }
        }
        // Simple line to mouse
        const path = `M ${bestPort.x} ${bestPort.y} L ${mousePos.x} ${mousePos.y}`
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
