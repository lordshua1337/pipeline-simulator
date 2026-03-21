// Universal Simulation Workbench -- Core Types

export type SimulationType =
  | 'flow_builder'
  | 'form_analyzer'
  | 'pipeline'
  | 'ab_test'
  | 'revenue_forecast'
  | 'cohort_analysis'
  | 'pricing_sim'
  | 'lead_scoring'

export interface SimTypeInfo {
  readonly type: SimulationType
  readonly label: string
  readonly description: string
  readonly icon: string
  readonly color: string
}

export const SIM_TYPES: readonly SimTypeInfo[] = [
  { type: 'flow_builder', label: 'Flow Builder', description: 'Drag-and-drop visual pipeline with node-based simulation', icon: 'GitBranch', color: '#3B82F6' },
  { type: 'form_analyzer', label: 'Form Analyzer', description: 'Upload CSV or enter stages to model drop-off and lead impact', icon: 'FormInput', color: '#8B5CF6' },
  { type: 'pipeline', label: 'Pipeline', description: 'Kanban-style pipeline with Monte Carlo and sensitivity analysis', icon: 'Workflow', color: '#06B6D4' },
  { type: 'ab_test', label: 'A/B Test', description: 'Compare two variants with statistical significance and sample sizing', icon: 'FlaskConical', color: '#F59E0B' },
  { type: 'revenue_forecast', label: 'Revenue Forecast', description: 'Project MRR, ARR, and LTV with churn and growth modeling', icon: 'TrendingUp', color: '#22C55E' },
  { type: 'cohort_analysis', label: 'Cohort Analysis', description: 'Retention curves, LTV by cohort, churn rate modeling', icon: 'Users', color: '#EC4899' },
  { type: 'pricing_sim', label: 'Pricing Simulator', description: 'Revenue curves at different price points with elasticity modeling', icon: 'DollarSign', color: '#14B8A6' },
  { type: 'lead_scoring', label: 'Lead Scoring', description: 'Weight signals, test thresholds, import leads to validate', icon: 'Target', color: '#EF4444' },
]

// --- Per-sim data shapes ---

export interface ABTestData {
  readonly variantA: { readonly name: string; readonly traffic: number; readonly conversionRate: number; readonly revenuePerConversion: number }
  readonly variantB: { readonly name: string; readonly traffic: number; readonly conversionRate: number; readonly revenuePerConversion: number }
  readonly dailyTraffic: number
  readonly trafficSplit: number
}

export interface RevenueData {
  readonly currentMRR: number
  readonly monthlyGrowthRate: number
  readonly monthlyChurnRate: number
  readonly expansionRate: number
  readonly avgNewCustomerValue: number
  readonly months: number
  readonly scenarios: {
    readonly optimistic: { readonly growthMultiplier: number; readonly churnMultiplier: number }
    readonly pessimistic: { readonly growthMultiplier: number; readonly churnMultiplier: number }
  }
}

export interface CohortRow {
  readonly cohort: string
  readonly acquired: number
  readonly retention: readonly number[]
}

export interface CohortData {
  readonly cohorts: readonly CohortRow[]
  readonly avgRevenuePerUser: number
}

export interface PricingData {
  readonly currentPrice: number
  readonly currentVolume: number
  readonly elasticity: number
  readonly costPerUnit: number
  readonly pricePoints: readonly number[]
}

export interface LeadSignal {
  readonly id: string
  readonly name: string
  readonly weight: number
  readonly type: 'boolean' | 'numeric' | 'categorical'
}

export interface LeadScoringData {
  readonly signals: readonly LeadSignal[]
  readonly threshold: number
  readonly leads: readonly Record<string, unknown>[]
}

export interface FormAnalyzerData {
  readonly stages: readonly { readonly name: string; readonly visitors: number }[]
}

// Discriminated union for tab data
export type SimTabData =
  | { readonly type: 'flow_builder'; readonly flowId: string }
  | { readonly type: 'form_analyzer'; readonly data: FormAnalyzerData }
  | { readonly type: 'pipeline'; readonly pipelineId: string }
  | { readonly type: 'ab_test'; readonly data: ABTestData }
  | { readonly type: 'revenue_forecast'; readonly data: RevenueData }
  | { readonly type: 'cohort_analysis'; readonly data: CohortData }
  | { readonly type: 'pricing_sim'; readonly data: PricingData }
  | { readonly type: 'lead_scoring'; readonly data: LeadScoringData }

export interface WorkspaceTab {
  readonly id: string
  readonly name: string
  readonly simData: SimTabData
  readonly createdAt: string
  readonly updatedAt: string
}

export interface WorkspaceState {
  readonly tabs: readonly WorkspaceTab[]
  readonly activeTabId: string | null
}

// Default data factories
export const DEFAULT_AB_TEST: ABTestData = {
  variantA: { name: 'Control', traffic: 5000, conversionRate: 0.032, revenuePerConversion: 97 },
  variantB: { name: 'Variant B', traffic: 5000, conversionRate: 0.041, revenuePerConversion: 97 },
  dailyTraffic: 1000,
  trafficSplit: 50,
}

export const DEFAULT_REVENUE: RevenueData = {
  currentMRR: 25000,
  monthlyGrowthRate: 0.08,
  monthlyChurnRate: 0.05,
  expansionRate: 0.03,
  avgNewCustomerValue: 99,
  months: 24,
  scenarios: {
    optimistic: { growthMultiplier: 1.3, churnMultiplier: 0.7 },
    pessimistic: { growthMultiplier: 0.7, churnMultiplier: 1.3 },
  },
}

export const DEFAULT_COHORT: CohortData = {
  cohorts: [
    { cohort: 'Jan', acquired: 500, retention: [100, 68, 52, 41, 35, 30] },
    { cohort: 'Feb', acquired: 620, retention: [100, 72, 55, 44, 37, 32] },
    { cohort: 'Mar', acquired: 580, retention: [100, 65, 48, 38, 31, 0] },
    { cohort: 'Apr', acquired: 710, retention: [100, 70, 54, 42, 0, 0] },
    { cohort: 'May', acquired: 680, retention: [100, 74, 58, 0, 0, 0] },
    { cohort: 'Jun', acquired: 750, retention: [100, 71, 0, 0, 0, 0] },
  ],
  avgRevenuePerUser: 49,
}

export const DEFAULT_PRICING: PricingData = {
  currentPrice: 49,
  currentVolume: 500,
  elasticity: 1.5,
  costPerUnit: 12,
  pricePoints: [19, 29, 39, 49, 59, 69, 79, 99, 129, 149],
}

export const DEFAULT_LEAD_SCORING: LeadScoringData = {
  signals: [
    { id: '1', name: 'Company Size 50+', weight: 25, type: 'boolean' },
    { id: '2', name: 'Decision Maker Title', weight: 30, type: 'boolean' },
    { id: '3', name: 'Visited Pricing Page', weight: 20, type: 'boolean' },
    { id: '4', name: 'Downloaded Content', weight: 15, type: 'boolean' },
    { id: '5', name: 'Email Engagement', weight: 10, type: 'numeric' },
  ],
  threshold: 60,
  leads: [],
}

export const DEFAULT_FORM: FormAnalyzerData = {
  stages: [
    { name: 'Page Load', visitors: 10000 },
    { name: 'Started Form', visitors: 3500 },
    { name: 'Email Entered', visitors: 2800 },
    { name: 'Phone Entered', visitors: 1900 },
    { name: 'Form Submitted', visitors: 1200 },
  ],
}
