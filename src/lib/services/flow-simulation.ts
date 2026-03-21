// Flow Builder -- DAG-Aware Simulation Engine

import type {
  FlowDocument,
  FlowNode,
  FlowSimulationResult,
  FlowNodeResult,
  FlowMonteCarloResult,
} from '../flow-types'
import { topologicalSort, getIncomingEdges, getOutgoingEdges } from '../utils/graph'
import { normalRandom, calculateMean, calculateStdDev, calculatePercentile, calculateMedian } from '../utils/statistics'

export function simulateFlow(flow: FlowDocument): FlowSimulationResult {
  const sorted = topologicalSort(flow.nodes, flow.edges)
  const trafficIn = new Map<string, number>()
  const trafficOut = new Map<string, number>()
  const revenue = new Map<string, number>()
  const cost = new Map<string, number>()

  for (const node of sorted) {
    const incoming = getIncomingEdges(node.id, flow.edges)

    // Calculate traffic entering this node
    let inbound: number
    if (incoming.length === 0) {
      // Root node -- uses its own traffic volume
      inbound = node.metrics.trafficVolume
    } else {
      // Sum traffic from all upstream nodes
      inbound = incoming.reduce((sum, edge) => {
        const upstreamOut = trafficOut.get(edge.sourceId) || 0
        const outgoing = getOutgoingEdges(edge.sourceId, flow.edges)
        // Split traffic if multiple outgoing edges
        if (edge.splitPercentage !== undefined) {
          return sum + upstreamOut * (edge.splitPercentage / 100)
        }
        return sum + upstreamOut / Math.max(outgoing.length, 1)
      }, 0)
    }

    trafficIn.set(node.id, inbound)

    // Apply conversion rate
    const converted = inbound * node.metrics.conversionRate
    trafficOut.set(node.id, converted)

    // Calculate revenue at this node
    const nodeRevenue = converted * node.metrics.revenuePerSale
    revenue.set(node.id, nodeRevenue)

    // Calculate cost
    const nodeCost = inbound * node.metrics.costPerClick + converted * node.metrics.costPerLead
    cost.set(node.id, nodeCost)
  }

  const totalRevenue = Array.from(revenue.values()).reduce((a, b) => a + b, 0)
  const totalCost = Array.from(cost.values()).reduce((a, b) => a + b, 0)
  const netProfit = totalRevenue - totalCost
  const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0

  const perNodeResults: FlowNodeResult[] = sorted.map((node) => ({
    nodeId: node.id,
    label: node.label,
    trafficIn: trafficIn.get(node.id) || 0,
    trafficOut: trafficOut.get(node.id) || 0,
    revenue: revenue.get(node.id) || 0,
    cost: cost.get(node.id) || 0,
    conversionRate: node.metrics.conversionRate,
  }))

  // Find bottleneck: node with lowest conversion rate that has meaningful traffic
  let bottleneckNodeId: string | null = null
  let worstConversion = Infinity
  for (const result of perNodeResults) {
    if (result.trafficIn > 10 && result.conversionRate < worstConversion && result.conversionRate < 1) {
      worstConversion = result.conversionRate
      bottleneckNodeId = result.nodeId
    }
  }

  return { totalRevenue, totalCost, roi, netProfit, perNodeResults, bottleneckNodeId }
}

export function monteCarloFlow(
  flow: FlowDocument,
  iterations: number = 1000,
  variancePercent: number = 20
): FlowMonteCarloResult {
  const results: number[] = []

  for (let i = 0; i < iterations; i++) {
    // Create a variant with randomized conversion rates
    const variantNodes: FlowNode[] = flow.nodes.map((node) => {
      const stdDev = node.metrics.conversionRate * (variancePercent / 100)
      const randomConv = Math.max(0.01, Math.min(0.99, normalRandom(node.metrics.conversionRate, stdDev)))
      return {
        ...node,
        metrics: { ...node.metrics, conversionRate: randomConv },
      }
    })

    const variantFlow: FlowDocument = { ...flow, nodes: variantNodes }
    const result = simulateFlow(variantFlow)
    results.push(result.netProfit)
  }

  const sorted = [...results].sort((a, b) => a - b)
  const mean = calculateMean(sorted)
  const stdDev = calculateStdDev(sorted, mean)

  return {
    mean,
    median: calculateMedian(sorted),
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p5: calculatePercentile(sorted, 5),
    p25: calculatePercentile(sorted, 25),
    p75: calculatePercentile(sorted, 75),
    p95: calculatePercentile(sorted, 95),
    distribution: sorted,
    iterations,
  }
}

export function whatIfAnalysis(
  flow: FlowDocument,
  nodeId: string,
  metricKey: 'conversionRate' | 'trafficVolume' | 'revenuePerSale',
  newValue: number
): { before: FlowSimulationResult; after: FlowSimulationResult; delta: number; deltaPct: number } {
  const before = simulateFlow(flow)

  const modifiedNodes = flow.nodes.map((n) =>
    n.id === nodeId ? { ...n, metrics: { ...n.metrics, [metricKey]: newValue } } : n
  )
  const after = simulateFlow({ ...flow, nodes: modifiedNodes })

  const delta = after.netProfit - before.netProfit
  const deltaPct = before.netProfit !== 0 ? (delta / Math.abs(before.netProfit)) * 100 : 0

  return { before, after, delta, deltaPct }
}
