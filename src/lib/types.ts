// Pipeline Simulator -- Core Types

export type PipelineType =
  | 'sales_funnel'
  | 'content_production'
  | 'hiring'
  | 'product_launch'
  | 'client_onboarding'
  | 'support_tickets'
  | 'custom'

export type PipelineStatus = 'active' | 'archived' | 'template'

export type HealthStatus = 'green' | 'yellow' | 'red'

export interface Pipeline {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly type: PipelineType
  readonly status: PipelineStatus
  readonly createdAt: string
  readonly updatedAt: string
}

export interface Stage {
  readonly id: string
  readonly pipelineId: string
  readonly name: string
  readonly description: string | null
  readonly position: number
  readonly color: string
  readonly autoAdvanceEnabled: boolean
  readonly autoAdvanceDays: number
  readonly slaWarningHours: number
  readonly createdAt: string
}

export interface Item {
  readonly id: string
  readonly pipelineId: string
  readonly stageId: string
  readonly title: string
  readonly description: string | null
  readonly value: number
  readonly metadata: Record<string, unknown>
  readonly enteredAt: string
  readonly updatedAt: string
  readonly isSample?: boolean
}

export interface StageHistory {
  readonly id: string
  readonly itemId: string
  readonly fromStageId: string | null
  readonly toStageId: string
  readonly timeInStageSeconds: number | null
  readonly movedAt: string
}

export interface AnalyticsMetrics {
  readonly velocity: number
  readonly cycleTime: number
  readonly throughput: number
  readonly conversionRate: number
  readonly bottleneckScore: number
}

export interface MonteCarloResult {
  readonly meanThroughput: number
  readonly stdDev: number
  readonly confidenceInterval95: readonly [number, number]
  readonly percentiles: {
    readonly p10: number
    readonly p25: number
    readonly p50: number
    readonly p75: number
    readonly p90: number
  }
  readonly iterations: number
}

export interface SensitivityResult {
  readonly parameter: string
  readonly impactOnThroughput: number
  readonly rank: number
}

export interface ForecastResult {
  readonly estimatedCompletions: number
  readonly confidenceInterval95: readonly [number, number]
  readonly projectedDate: string
}

export interface TemplateConfig {
  readonly stages: readonly {
    readonly name: string
    readonly description?: string
    readonly color: string
  }[]
  readonly sampleItems?: readonly {
    readonly title: string
    readonly value: number
    readonly stageIndex: number
    readonly description?: string
  }[]
}

export interface PipelineTemplate {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly type: PipelineType
  readonly icon: string
  readonly color: string
  readonly config: TemplateConfig
  readonly benchmarks: Record<string, number>
}

export interface DataSufficiencyCheck {
  readonly hasEnoughData: boolean
  readonly completedItemCount: number
  readonly requiredCount: number
  readonly message: string
  readonly readinessBadge: 'Beta (limited data)' | 'Ready'
}

// Webhook payload types (stubs)
export interface IdeaReadyPayload {
  readonly source: string
  readonly timestamp: string
  readonly ideaId: string
  readonly score: number
  readonly brief: string
  readonly trends: readonly string[]
  readonly competitors: readonly string[]
}

export interface PipelineReadyPayload {
  readonly source: string
  readonly timestamp: string
  readonly pipelineId: string
  readonly product: string
  readonly stage: string
}
