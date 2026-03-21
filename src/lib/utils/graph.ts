// DAG graph utilities for flow simulation

import type { FlowNode, FlowEdge } from '../flow-types'

export function findRootNodes(
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[]
): readonly FlowNode[] {
  const targetIds = new Set(edges.map((e) => e.targetId))
  return nodes.filter((n) => !targetIds.has(n.id))
}

export function findLeafNodes(
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[]
): readonly FlowNode[] {
  const sourceIds = new Set(edges.map((e) => e.sourceId))
  return nodes.filter((n) => !sourceIds.has(n.id))
}

export function topologicalSort(
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[]
): readonly FlowNode[] {
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const node of nodes) {
    inDegree.set(node.id, 0)
    adjacency.set(node.id, [])
  }

  for (const edge of edges) {
    inDegree.set(edge.targetId, (inDegree.get(edge.targetId) || 0) + 1)
    const neighbors = adjacency.get(edge.sourceId) || []
    adjacency.set(edge.sourceId, [...neighbors, edge.targetId])
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const sorted: FlowNode[] = []
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  while (queue.length > 0) {
    const current = queue.shift()!
    const node = nodeMap.get(current)
    if (node) sorted.push(node)

    for (const neighbor of adjacency.get(current) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1
      inDegree.set(neighbor, newDeg)
      if (newDeg === 0) queue.push(neighbor)
    }
  }

  return sorted
}

export function getOutgoingEdges(
  nodeId: string,
  edges: readonly FlowEdge[]
): readonly FlowEdge[] {
  return edges.filter((e) => e.sourceId === nodeId)
}

export function getIncomingEdges(
  nodeId: string,
  edges: readonly FlowEdge[]
): readonly FlowEdge[] {
  return edges.filter((e) => e.targetId === nodeId)
}

export function hasCycle(
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[]
): boolean {
  const sorted = topologicalSort(nodes, edges)
  return sorted.length < nodes.length
}
