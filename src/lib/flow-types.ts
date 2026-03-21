// Flow Builder -- Core Types

export type FlowNodeType =
  | 'traffic_source'
  | 'landing_page'
  | 'opt_in_form'
  | 'sales_page'
  | 'upsell'
  | 'downsell'
  | 'email_sequence'
  | 'checkout'
  | 'thank_you'
  | 'custom'

export type TrafficSourceKind =
  | 'paid_ads'
  | 'organic'
  | 'referral'
  | 'email'
  | 'social'
  | 'direct'

export interface FlowNodeMetrics {
  readonly trafficVolume: number
  readonly conversionRate: number
  readonly costPerClick: number
  readonly costPerLead: number
  readonly revenuePerSale: number
  readonly timeInStageHours: number
  readonly dropOffRate: number
}

export interface FlowNode {
  readonly id: string
  readonly type: FlowNodeType
  readonly label: string
  readonly position: { readonly x: number; readonly y: number }
  readonly metrics: FlowNodeMetrics
  readonly config: Readonly<Record<string, unknown>>
}

export interface FlowEdge {
  readonly id: string
  readonly sourceId: string
  readonly targetId: string
  readonly label?: string
  readonly splitPercentage?: number
}

export interface FlowViewport {
  readonly x: number
  readonly y: number
  readonly zoom: number
}

export interface FlowDocument {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly nodes: readonly FlowNode[]
  readonly edges: readonly FlowEdge[]
  readonly viewport: FlowViewport
  readonly createdAt: string
  readonly updatedAt: string
}

export interface FlowTemplate {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly category: string
  readonly icon: string
  readonly nodes: readonly Omit<FlowNode, 'id'>[]
  readonly edges: readonly {
    readonly sourceIndex: number
    readonly targetIndex: number
    readonly label?: string
    readonly splitPercentage?: number
  }[]
}

export interface FlowNodeResult {
  readonly nodeId: string
  readonly label: string
  readonly trafficIn: number
  readonly trafficOut: number
  readonly revenue: number
  readonly cost: number
  readonly conversionRate: number
}

export interface FlowSimulationResult {
  readonly totalRevenue: number
  readonly totalCost: number
  readonly roi: number
  readonly netProfit: number
  readonly perNodeResults: readonly FlowNodeResult[]
  readonly bottleneckNodeId: string | null
}

export interface FlowMonteCarloResult {
  readonly mean: number
  readonly median: number
  readonly stdDev: number
  readonly min: number
  readonly max: number
  readonly p5: number
  readonly p25: number
  readonly p75: number
  readonly p95: number
  readonly distribution: readonly number[]
  readonly iterations: number
}

export const DEFAULT_METRICS: FlowNodeMetrics = {
  trafficVolume: 0,
  conversionRate: 0.5,
  costPerClick: 0,
  costPerLead: 0,
  revenuePerSale: 0,
  timeInStageHours: 0,
  dropOffRate: 0,
}

export const NODE_TYPE_META: Record<FlowNodeType, {
  readonly label: string
  readonly category: string
  readonly color: string
  readonly defaultMetrics: Partial<FlowNodeMetrics>
}> = {
  traffic_source: { label: 'Traffic Source', category: 'Traffic', color: '#3B82F6', defaultMetrics: { trafficVolume: 1000, costPerClick: 1.50 } },
  landing_page: { label: 'Landing Page', category: 'Pages', color: '#06B6D4', defaultMetrics: { conversionRate: 0.35 } },
  opt_in_form: { label: 'Opt-in Form', category: 'Capture', color: '#8B5CF6', defaultMetrics: { conversionRate: 0.25 } },
  sales_page: { label: 'Sales Page', category: 'Pages', color: '#F59E0B', defaultMetrics: { conversionRate: 0.08 } },
  upsell: { label: 'Upsell', category: 'Revenue', color: '#10B981', defaultMetrics: { conversionRate: 0.30, revenuePerSale: 47 } },
  downsell: { label: 'Downsell', category: 'Revenue', color: '#6366F1', defaultMetrics: { conversionRate: 0.45, revenuePerSale: 27 } },
  email_sequence: { label: 'Email Sequence', category: 'Nurture', color: '#EC4899', defaultMetrics: { conversionRate: 0.15 } },
  checkout: { label: 'Checkout', category: 'Capture', color: '#22C55E', defaultMetrics: { conversionRate: 0.65, revenuePerSale: 97 } },
  thank_you: { label: 'Thank You', category: 'Pages', color: '#14B8A6', defaultMetrics: { conversionRate: 1.0 } },
  custom: { label: 'Custom Step', category: 'Other', color: '#64748B', defaultMetrics: { conversionRate: 0.5 } },
}
