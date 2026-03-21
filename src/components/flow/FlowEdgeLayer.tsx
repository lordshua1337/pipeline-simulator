'use client'

import type { FlowNode, FlowEdge } from '@/lib/flow-types'

// Match BaseFlowNode dimensions
const NODE_W = 200

// Estimate node height based on metric count (header ~36px + metrics ~14px each + padding 12px)
function estimateNodeHeight(node: FlowNode): number {
  let metricCount = 1 // conv rate always shown
  if (node.metrics.trafficVolume > 0) metricCount++
  if (node.metrics.revenuePerSale > 0) metricCount++
  if (node.metrics.costPerClick > 0) metricCount++
  if (node.metrics.costPerLead > 0) metricCount++
  if (node.metrics.timeInStageHours > 0) metricCount++
  if (node.metrics.dropOffRate > 0) metricCount++
  // header(36) + variant line maybe(14) + metrics(14 each) + padding(12)
  const hasVariant = !!node.config?.variant
  return 36 + (hasVariant ? 14 : 0) + metricCount * 14 + 12
}

type Side = 'top' | 'right' | 'bottom' | 'left'

interface Port { x: number; y: number; side: Side }

function getNodePorts(node: FlowNode): Record<Side, Port> {
  const h = estimateNodeHeight(node)
  const cx = node.position.x + NODE_W / 2
  const cy = node.position.y + h / 2
  return {
    top:    { x: cx, y: node.position.y, side: 'top' },
    right:  { x: node.position.x + NODE_W, y: cy, side: 'right' },
    bottom: { x: cx, y: node.position.y + h, side: 'bottom' },
    left:   { x: node.position.x, y: cy, side: 'left' },
  }
}

function getBestPorts(source: FlowNode, target: FlowNode): { from: Port; to: Port } {
  const sPorts = getNodePorts(source)
  const tPorts = getNodePorts(target)
  const dx = target.position.x - source.position.x
  const dy = target.position.y - source.position.y
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (absDx > absDy) {
    return dx > 0
      ? { from: sPorts.right, to: tPorts.left }
      : { from: sPorts.left, to: tPorts.right }
  } else {
    return dy > 0
      ? { from: sPorts.bottom, to: tPorts.top }
      : { from: sPorts.top, to: tPorts.bottom }
  }
}

function bezierPath(from: Port, to: Port): string {
  const isHorizontal = from.side === 'left' || from.side === 'right'
  if (isHorizontal) {
    const dx = Math.max(Math.abs(to.x - from.x) * 0.4, 30)
    const cx1 = from.side === 'right' ? from.x + dx : from.x - dx
    const cx2 = to.side === 'left' ? to.x - dx : to.x + dx
    return `M ${from.x} ${from.y} C ${cx1} ${from.y}, ${cx2} ${to.y}, ${to.x} ${to.y}`
  } else {
    const dy = Math.max(Math.abs(to.y - from.y) * 0.4, 30)
    const cy1 = from.side === 'bottom' ? from.y + dy : from.y - dy
    const cy2 = to.side === 'top' ? to.y - dy : to.y + dy
    return `M ${from.x} ${from.y} C ${from.x} ${cy1}, ${to.x} ${cy2}, ${to.x} ${to.y}`
  }
}

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
  onInsertNode?: (edgeId: string, position: { x: number; y: number }) => void
  connectingFrom: string | null
  mousePos: { x: number; y: number } | null
}

export function FlowEdgeLayer({
  nodes, edges, selectedEdgeId, onSelectEdge, onInsertNode, connectingFrom, mousePos,
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
          <g key={edge.id} className="group/edge">
            <path d={path} fill="none" stroke="transparent" strokeWidth={16}
              className="pointer-events-auto cursor-pointer" onClick={() => onSelectEdge(edge.id)} />
            <path d={path} fill="none" stroke={isSelected ? '#3B82F6' : '#CBD5E1'}
              strokeWidth={isSelected ? 2.5 : 1.5} className="transition-colors" />
            <polygon points={arrowPoints(to)} fill={isSelected ? '#3B82F6' : '#94A3B8'} />
            {/* Insert node button at midpoint */}
            {onInsertNode && (
              <g
                className="pointer-events-auto cursor-pointer opacity-0 group-hover/edge:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  onInsertNode(edge.id, { x: mx - 100, y: my - 45 })
                }}
              >
                <circle cx={mx} cy={my} r={10} fill="white" stroke="#CBD5E1" strokeWidth={1.5} />
                <line x1={mx - 4} y1={my} x2={mx + 4} y2={my} stroke="#6B7280" strokeWidth={1.5} strokeLinecap="round" />
                <line x1={mx} y1={my - 4} x2={mx} y2={my + 4} stroke="#6B7280" strokeWidth={1.5} strokeLinecap="round" />
              </g>
            )}
          </g>
        )
      })}

      {connectingFrom && mousePos && (() => {
        const source = nodeMap.get(connectingFrom)
        if (!source) return null
        const ports = getNodePorts(source)
        let bestPort = ports.right
        let bestDist = Infinity
        for (const port of Object.values(ports)) {
          const d = Math.hypot(mousePos.x - port.x, mousePos.y - port.y)
          if (d < bestDist) { bestDist = d; bestPort = port }
        }
        return (
          <path
            d={`M ${bestPort.x} ${bestPort.y} L ${mousePos.x} ${mousePos.y}`}
            fill="none" stroke="#3B82F6" strokeWidth={2} strokeDasharray="6 4" opacity={0.6}
          />
        )
      })()}
    </svg>
  )
}
