// Preset Store -- save/load named pricing configurations

export interface PricingPreset {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly baseConfig: {
    readonly currentPrice: number
    readonly currentVolume: number
    readonly elasticity: number
    readonly costPerUnit: number
    readonly pricePoints: readonly number[]
  }
  readonly variables: readonly {
    readonly id: string
    readonly values: Readonly<Record<string, number>>
  }[]
  readonly createdAt: string
  readonly updatedAt: string
}

const STORAGE_KEY = 'pipeline-pricing-presets'

let counter = 0
function genId(): string {
  counter++
  return `preset-${Date.now()}-${counter}`
}

export function loadPresets(): readonly PricingPreset[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PricingPreset[]
  } catch {
    return []
  }
}

function save(presets: readonly PricingPreset[]): readonly PricingPreset[] {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  }
  return presets
}

export function savePreset(preset: Omit<PricingPreset, 'id' | 'createdAt' | 'updatedAt'>): readonly PricingPreset[] {
  const now = new Date().toISOString()
  const full: PricingPreset = { ...preset, id: genId(), createdAt: now, updatedAt: now }
  return save([full, ...loadPresets()])
}

export function updatePreset(id: string, updates: Partial<PricingPreset>): readonly PricingPreset[] {
  return save(
    loadPresets().map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    )
  )
}

export function deletePreset(id: string): readonly PricingPreset[] {
  return save(loadPresets().filter((p) => p.id !== id))
}

// Built-in starter presets
export const STARTER_PRESETS: readonly PricingPreset[] = [
  {
    id: 'starter-saas',
    name: 'SaaS Subscription',
    description: 'Typical B2B SaaS with churn, CAC, support, and payment processing',
    baseConfig: { currentPrice: 49, currentVolume: 500, elasticity: 1.2, costPerUnit: 5, pricePoints: [19, 29, 39, 49, 59, 79, 99, 129, 149, 199] },
    variables: [
      { id: 'churn', values: { churnRate: 4, avgLifetimeMonths: 18 } },
      { id: 'cac', values: { cacPerCustomer: 120 } },
      { id: 'support', values: { supportCost: 12 } },
      { id: 'payment', values: { processingPct: 2.9, perTxnFee: 0.30 } },
      { id: 'upsell', values: { upsellRate: 15, upsellValue: 29 } },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'starter-ecommerce',
    name: 'E-commerce Product',
    description: 'Physical product with shipping, refunds, seasonal demand, and processing',
    baseConfig: { currentPrice: 39, currentVolume: 800, elasticity: 1.8, costPerUnit: 14, pricePoints: [19, 24, 29, 34, 39, 44, 49, 59, 69, 79] },
    variables: [
      { id: 'shipping', values: { shippingCost: 6.50 } },
      { id: 'refunds', values: { refundRate: 12 } },
      { id: 'payment', values: { processingPct: 2.9, perTxnFee: 0.30 } },
      { id: 'seasonal', values: { peakMultiplier: 180, peakMonths: 3 } },
      { id: 'ltv_multiplier', values: { avgPurchases: 1.8 } },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'starter-agency',
    name: 'Service / Agency',
    description: 'High-ticket service with commission, overhead, and time-to-revenue',
    baseConfig: { currentPrice: 2500, currentVolume: 20, elasticity: 0.8, costPerUnit: 800, pricePoints: [1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 7500, 10000] },
    variables: [
      { id: 'commission', values: { commissionRate: 8 } },
      { id: 'overhead', values: { monthlyOverhead: 25000 } },
      { id: 'time_to_revenue', values: { daysToCollect: 45, costOfCapital: 10 } },
      { id: 'cac', values: { cacPerCustomer: 500 } },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'starter-digital',
    name: 'Digital Product / Course',
    description: 'Zero marginal cost product with high refunds and promotional pricing',
    baseConfig: { currentPrice: 197, currentVolume: 150, elasticity: 1.5, costPerUnit: 0, pricePoints: [47, 67, 97, 127, 147, 197, 247, 297, 397, 497] },
    variables: [
      { id: 'refunds', values: { refundRate: 15 } },
      { id: 'discount', values: { discountPct: 30, discountedShare: 40 } },
      { id: 'payment', values: { processingPct: 2.9, perTxnFee: 0.30 } },
      { id: 'upsell', values: { upsellRate: 25, upsellValue: 97 } },
      { id: 'cac', values: { cacPerCustomer: 45 } },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]
