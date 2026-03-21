'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import type { PricingData } from '@/lib/workspace-types'
import { Plus, X, TrendingUp, TrendingDown, Users, Repeat, Gift, Percent, ShieldCheck, Package, Calendar, Scale, Building2, CreditCard, Truck, Clock, BadgeDollarSign, Info, Save, FolderOpen, Pencil, Trash2, ChevronLeft } from 'lucide-react'
import { loadPresets, savePreset, deletePreset, updatePreset, STARTER_PRESETS, type PricingPreset } from '@/lib/preset-store'

interface PricingSimProps {
  data: PricingData
  onChange: (data: PricingData) => void
}

interface VarDefinition {
  readonly id: string
  readonly name: string
  readonly icon: typeof TrendingUp
  readonly color: string
  readonly description: string
  readonly tooltip: string
  readonly fields: readonly { key: string; label: string; defaultValue: number; suffix: string; step: string; tip: string }[]
  readonly effect: (base: AnalysisRow, values: Record<string, number>) => AnalysisRow
}

interface AnalysisRow {
  price: number
  volume: number
  revenue: number
  cost: number
  profit: number
  margin: number
}

const AVAILABLE_VARIABLES: readonly VarDefinition[] = [
  {
    id: 'cac',
    name: 'Customer Acquisition Cost',
    icon: Users,
    color: '#3B82F6',
    description: 'Factor in cost to acquire each customer',
    tooltip: 'The total cost to acquire one paying customer -- includes ad spend, sales time, onboarding. This gets subtracted from profit at every price point. If your CAC is higher than your margin, you lose money on every sale.',
    fields: [
      { key: 'cacPerCustomer', label: 'CAC', defaultValue: 25, suffix: '$', step: '1', tip: 'Total blended cost to acquire one customer' },
    ],
    effect: (row, vals) => {
      const totalCac = row.volume * vals.cacPerCustomer
      return { ...row, cost: row.cost + totalCac, profit: row.profit - totalCac, margin: row.revenue > 0 ? ((row.profit - totalCac) / row.revenue) * 100 : 0 }
    },
  },
  {
    id: 'churn',
    name: 'Monthly Churn',
    icon: TrendingDown,
    color: '#EF4444',
    description: 'For subscriptions -- reduce effective volume by churn rate',
    tooltip: 'Subscription churn means you lose a percentage of customers every month. This calculates lifetime value: price x months x retention. A 5% monthly churn means your average customer stays ~20 months.',
    fields: [
      { key: 'churnRate', label: 'Monthly Churn', defaultValue: 5, suffix: '%', step: '0.5', tip: 'What % of customers cancel each month' },
      { key: 'avgLifetimeMonths', label: 'Avg Lifetime', defaultValue: 12, suffix: 'mo', step: '1', tip: 'How many months the average customer stays' },
    ],
    effect: (row, vals) => {
      const ltv = row.price * vals.avgLifetimeMonths * (1 - vals.churnRate / 100)
      const ltvRevenue = row.volume * ltv
      return { ...row, revenue: ltvRevenue, profit: ltvRevenue - row.cost, margin: ltvRevenue > 0 ? ((ltvRevenue - row.cost) / ltvRevenue) * 100 : 0 }
    },
  },
  {
    id: 'upsell',
    name: 'Upsell / Cross-sell',
    icon: TrendingUp,
    color: '#10B981',
    description: 'Additional revenue per customer from upsells',
    tooltip: 'What percentage of buyers also purchase an upsell or cross-sell. This adds revenue without adding acquisition cost -- pure margin boost.',
    fields: [
      { key: 'upsellRate', label: 'Upsell Rate', defaultValue: 20, suffix: '%', step: '1', tip: '% of buyers who also buy the upsell' },
      { key: 'upsellValue', label: 'Upsell Value', defaultValue: 35, suffix: '$', step: '1', tip: 'Revenue from each upsell purchase' },
    ],
    effect: (row, vals) => {
      const upsellRev = row.volume * (vals.upsellRate / 100) * vals.upsellValue
      return { ...row, revenue: row.revenue + upsellRev, profit: row.profit + upsellRev, margin: (row.revenue + upsellRev) > 0 ? ((row.profit + upsellRev) / (row.revenue + upsellRev)) * 100 : 0 }
    },
  },
  {
    id: 'refunds',
    name: 'Refund Rate',
    icon: Repeat,
    color: '#F59E0B',
    description: 'Percentage of sales refunded',
    tooltip: 'Revenue you have to give back. Higher prices often increase refund rates. At 8%, you lose $8 of every $100 in revenue plus the processing fees on both transactions.',
    fields: [
      { key: 'refundRate', label: 'Refund Rate', defaultValue: 8, suffix: '%', step: '0.5', tip: '% of sales that get refunded' },
    ],
    effect: (row, vals) => {
      const lost = row.revenue * (vals.refundRate / 100)
      return { ...row, revenue: row.revenue - lost, profit: row.profit - lost, margin: (row.revenue - lost) > 0 ? ((row.profit - lost) / (row.revenue - lost)) * 100 : 0 }
    },
  },
  {
    id: 'discount',
    name: 'Promotional Discount',
    icon: Gift,
    color: '#8B5CF6',
    description: 'Run a discount on a portion of sales',
    tooltip: 'Models a promotion where X% of your sales happen at a discounted price. Shows the real revenue impact of running sales -- often the volume uplift does not compensate for the margin loss.',
    fields: [
      { key: 'discountPct', label: 'Discount', defaultValue: 20, suffix: '%', step: '1', tip: 'How much off the list price' },
      { key: 'discountedShare', label: 'Sales at Discount', defaultValue: 30, suffix: '%', step: '1', tip: '% of total sales made at the discount' },
    ],
    effect: (row, vals) => {
      const discountedVolume = row.volume * (vals.discountedShare / 100)
      const fullPriceVolume = row.volume - discountedVolume
      const discountedPrice = row.price * (1 - vals.discountPct / 100)
      const newRevenue = (fullPriceVolume * row.price) + (discountedVolume * discountedPrice)
      return { ...row, revenue: newRevenue, profit: newRevenue - row.cost, margin: newRevenue > 0 ? ((newRevenue - row.cost) / newRevenue) * 100 : 0 }
    },
  },
  {
    id: 'commission',
    name: 'Sales Commission',
    icon: Percent,
    color: '#0891B2',
    description: 'Percentage of revenue paid as sales commission',
    tooltip: 'What you pay your sales team as a % of each deal. At 10% commission on a $49 product, that is $4.90 per sale coming off your margin.',
    fields: [
      { key: 'commissionRate', label: 'Commission', defaultValue: 10, suffix: '%', step: '1', tip: '% of revenue paid to sales reps' },
    ],
    effect: (row, vals) => {
      const comm = row.revenue * (vals.commissionRate / 100)
      return { ...row, cost: row.cost + comm, profit: row.profit - comm, margin: row.revenue > 0 ? ((row.profit - comm) / row.revenue) * 100 : 0 }
    },
  },
  {
    id: 'support',
    name: 'Support Cost',
    icon: ShieldCheck,
    color: '#EC4899',
    description: 'Per-customer support/service cost',
    tooltip: 'The cost to serve each customer after the sale -- support tickets, account management, onboarding. Scales linearly with volume.',
    fields: [
      { key: 'supportCost', label: 'Cost / Customer', defaultValue: 8, suffix: '$', step: '1', tip: 'Blended support cost per customer per month' },
    ],
    effect: (row, vals) => {
      const sc = row.volume * vals.supportCost
      return { ...row, cost: row.cost + sc, profit: row.profit - sc, margin: row.revenue > 0 ? ((row.profit - sc) / row.revenue) * 100 : 0 }
    },
  },
  {
    id: 'bundle',
    name: 'Bundle Pricing',
    icon: Package,
    color: '#6366F1',
    description: 'Offer a bundle that increases perceived value + volume',
    tooltip: 'Bundling products increases perceived value and order volume, but at a lower per-unit price. Models the tradeoff between higher volume and lower margin.',
    fields: [
      { key: 'bundleUplift', label: 'Volume Uplift', defaultValue: 15, suffix: '%', step: '1', tip: 'How much volume increases from the bundle offer' },
      { key: 'bundleDiscount', label: 'Bundle Discount', defaultValue: 10, suffix: '%', step: '1', tip: 'Price reduction for the bundle' },
    ],
    effect: (row, vals) => {
      const newVol = Math.round(row.volume * (1 + vals.bundleUplift / 100))
      const newPrice = row.price * (1 - vals.bundleDiscount / 100)
      const newRev = newVol * newPrice
      const newCost = newVol * (row.cost / Math.max(row.volume, 1))
      return { ...row, volume: newVol, revenue: newRev, cost: newCost, profit: newRev - newCost, margin: newRev > 0 ? ((newRev - newCost) / newRev) * 100 : 0 }
    },
  },
  {
    id: 'seasonal',
    name: 'Seasonal Demand',
    icon: Calendar,
    color: '#14B8A6',
    description: 'Model peak/off-peak demand variation',
    tooltip: 'If your business has seasonal swings, this averages demand across peak and off-peak months to show annualized pricing impact.',
    fields: [
      { key: 'peakMultiplier', label: 'Peak Multiplier', defaultValue: 150, suffix: '%', step: '5', tip: 'How much volume increases during peak months (100% = normal)' },
      { key: 'peakMonths', label: 'Peak Months', defaultValue: 4, suffix: 'mo', step: '1', tip: 'How many months are considered peak season' },
    ],
    effect: (row, vals) => {
      const peakVol = row.volume * (vals.peakMultiplier / 100)
      const offVol = row.volume * 0.7
      const avgVol = Math.round((peakVol * vals.peakMonths + offVol * (12 - vals.peakMonths)) / 12)
      const newRev = avgVol * row.price
      const newCost = avgVol * (row.cost / Math.max(row.volume, 1))
      return { ...row, volume: avgVol, revenue: newRev, cost: newCost, profit: newRev - newCost, margin: newRev > 0 ? ((newRev - newCost) / newRev) * 100 : 0 }
    },
  },
  {
    id: 'scaling',
    name: 'Scaling Cost Curve',
    icon: Scale,
    color: '#7C3AED',
    description: 'COGS increases as volume scales (diminishing returns)',
    tooltip: 'Above a certain volume, your per-unit costs go up (hiring, infrastructure, quality control). Models the point where scaling gets expensive.',
    fields: [
      { key: 'scalingThreshold', label: 'Threshold', defaultValue: 500, suffix: 'units', step: '50', tip: 'Volume at which costs start increasing' },
      { key: 'scalingMultiplier', label: 'Cost Multiplier', defaultValue: 130, suffix: '%', step: '5', tip: 'How much COGS increases above threshold (130% = 30% more)' },
    ],
    effect: (row, vals) => {
      if (row.volume <= vals.scalingThreshold) return row
      const overThreshold = row.volume - vals.scalingThreshold
      const extraCost = overThreshold * (row.cost / Math.max(row.volume, 1)) * ((vals.scalingMultiplier / 100) - 1)
      return { ...row, cost: row.cost + extraCost, profit: row.profit - extraCost, margin: row.revenue > 0 ? ((row.profit - extraCost) / row.revenue) * 100 : 0 }
    },
  },
  {
    id: 'overhead',
    name: 'Fixed Overhead',
    icon: Building2,
    color: '#475569',
    description: 'Monthly fixed costs (rent, salaries, tools, etc.)',
    tooltip: 'Costs that do not change with volume -- rent, salaries, software, insurance. These eat into profit at every price point equally.',
    fields: [
      { key: 'monthlyOverhead', label: 'Monthly', defaultValue: 15000, suffix: '$', step: '1000', tip: 'Total monthly fixed expenses' },
    ],
    effect: (row, vals) => {
      return { ...row, cost: row.cost + vals.monthlyOverhead, profit: row.profit - vals.monthlyOverhead, margin: row.revenue > 0 ? ((row.profit - vals.monthlyOverhead) / row.revenue) * 100 : 0 }
    },
  },
  {
    id: 'payment',
    name: 'Payment Processing',
    icon: CreditCard,
    color: '#0369A1',
    description: 'Stripe/processor fees on every transaction',
    tooltip: 'Credit card processors take a cut of every sale. Stripe is 2.9% + $0.30. At low price points this is a significant margin hit.',
    fields: [
      { key: 'processingPct', label: 'Fee', defaultValue: 2.9, suffix: '%', step: '0.1', tip: 'Percentage fee per transaction (Stripe: 2.9%)' },
      { key: 'perTxnFee', label: 'Per Txn', defaultValue: 0.30, suffix: '$', step: '0.05', tip: 'Flat fee per transaction (Stripe: $0.30)' },
    ],
    effect: (row, vals) => {
      const fees = (row.revenue * vals.processingPct / 100) + (row.volume * vals.perTxnFee)
      return { ...row, cost: row.cost + fees, profit: row.profit - fees, margin: row.revenue > 0 ? ((row.profit - fees) / row.revenue) * 100 : 0 }
    },
  },
  {
    id: 'shipping',
    name: 'Shipping / Fulfillment',
    icon: Truck,
    color: '#92400E',
    description: 'Per-unit fulfillment and shipping cost',
    tooltip: 'Cost to pick, pack, and ship each unit. For physical products this is a major cost driver. For digital products this is near zero.',
    fields: [
      { key: 'shippingCost', label: 'Per Unit', defaultValue: 5.50, suffix: '$', step: '0.50', tip: 'Average cost to fulfill and ship one order' },
    ],
    effect: (row, vals) => {
      const sc = row.volume * vals.shippingCost
      return { ...row, cost: row.cost + sc, profit: row.profit - sc, margin: row.revenue > 0 ? ((row.profit - sc) / row.revenue) * 100 : 0 }
    },
  },
  {
    id: 'time_to_revenue',
    name: 'Time to Revenue',
    icon: Clock,
    color: '#B45309',
    description: 'Delay between sale and cash collection (cash flow impact)',
    tooltip: 'If you invoice net-30 or have payment processing delays, money sits uncollected. The cost of capital is what that delay costs you (opportunity cost or interest on credit lines).',
    fields: [
      { key: 'daysToCollect', label: 'Days to Collect', defaultValue: 30, suffix: 'days', step: '5', tip: 'Average days between sale and receiving cash' },
      { key: 'costOfCapital', label: 'Cost of Capital', defaultValue: 8, suffix: '%/yr', step: '1', tip: 'Annual cost of capital (loan rate or opportunity cost)' },
    ],
    effect: (row, vals) => {
      const dailyRate = vals.costOfCapital / 100 / 365
      const carryingCost = row.revenue * dailyRate * vals.daysToCollect
      return { ...row, cost: row.cost + carryingCost, profit: row.profit - carryingCost, margin: row.revenue > 0 ? ((row.profit - carryingCost) / row.revenue) * 100 : 0 }
    },
  },
  {
    id: 'ltv_multiplier',
    name: 'LTV Multiplier',
    icon: BadgeDollarSign,
    color: '#059669',
    description: 'Customers buy more than once -- multiply by repeat purchase rate',
    tooltip: 'If customers buy more than once, your true revenue per customer is price x number of purchases. This multiplies both revenue AND costs by the repeat rate.',
    fields: [
      { key: 'avgPurchases', label: 'Avg Purchases', defaultValue: 2.5, suffix: 'x', step: '0.5', tip: 'Average number of purchases per customer lifetime' },
    ],
    effect: (row, vals) => {
      const ltvRev = row.revenue * vals.avgPurchases
      const ltvCost = row.cost * vals.avgPurchases
      return { ...row, revenue: ltvRev, cost: ltvCost, profit: ltvRev - ltvCost, margin: ltvRev > 0 ? ((ltvRev - ltvCost) / ltvRev) * 100 : 0 }
    },
  },
]

function demandAtPrice(basePrice: number, baseVolume: number, elasticity: number, testPrice: number): number {
  if (basePrice <= 0) return baseVolume
  const pctChange = (testPrice - basePrice) / basePrice
  return Math.max(0, Math.round(baseVolume * (1 - elasticity * pctChange)))
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export function PricingSim({ data, onChange }: PricingSimProps) {
  const [showVarPicker, setShowVarPicker] = useState(false)
  const [activeVars, setActiveVars] = useState<{ id: string; values: Record<string, number> }[]>([])
  const [showPresets, setShowPresets] = useState(false)
  const [presets, setPresets] = useState<readonly PricingPreset[]>([])
  const [saveName, setSaveName] = useState('')
  const [saveDesc, setSaveDesc] = useState('')
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)

  useEffect(() => {
    const saved = loadPresets()
    setPresets(saved.length > 0 ? saved : STARTER_PRESETS)
  }, [])

  const addVariable = useCallback((varDef: VarDefinition) => {
    const defaults: Record<string, number> = {}
    for (const f of varDef.fields) defaults[f.key] = f.defaultValue
    setActiveVars((prev) => [...prev, { id: varDef.id, values: defaults }])
    setShowVarPicker(false)
  }, [])

  const removeVariable = useCallback((varId: string) => {
    setActiveVars((prev) => prev.filter((v) => v.id !== varId))
  }, [])

  const updateVarValue = useCallback((varId: string, key: string, value: number) => {
    setActiveVars((prev) => prev.map((v) =>
      v.id === varId ? { ...v, values: { ...v.values, [key]: value } } : v
    ))
  }, [])

  const handleLoadPreset = useCallback((preset: PricingPreset) => {
    onChange({
      ...data,
      currentPrice: preset.baseConfig.currentPrice,
      currentVolume: preset.baseConfig.currentVolume,
      elasticity: preset.baseConfig.elasticity,
      costPerUnit: preset.baseConfig.costPerUnit,
      pricePoints: preset.baseConfig.pricePoints,
    })
    setActiveVars([...preset.variables.map((v) => ({ ...v, values: { ...v.values } }))])
    setShowPresets(false)
  }, [data, onChange])

  const handleSavePreset = useCallback(() => {
    if (!saveName.trim()) return
    const saved = savePreset({
      name: saveName.trim(),
      description: saveDesc.trim(),
      baseConfig: {
        currentPrice: data.currentPrice,
        currentVolume: data.currentVolume,
        elasticity: data.elasticity,
        costPerUnit: data.costPerUnit,
        pricePoints: data.pricePoints,
      },
      variables: activeVars,
    })
    setPresets(saved)
    setSaveName('')
    setSaveDesc('')
    setShowSaveForm(false)
  }, [saveName, saveDesc, data, activeVars])

  const handleUpdatePreset = useCallback((id: string) => {
    const updated = updatePreset(id, {
      baseConfig: {
        currentPrice: data.currentPrice,
        currentVolume: data.currentVolume,
        elasticity: data.elasticity,
        costPerUnit: data.costPerUnit,
        pricePoints: data.pricePoints,
      },
      variables: activeVars,
    })
    setPresets(updated)
    setEditingPresetId(null)
  }, [data, activeVars])

  const handleDeletePreset = useCallback((id: string) => {
    setPresets(deletePreset(id))
  }, [])

  const unusedVars = AVAILABLE_VARIABLES.filter((v) => !activeVars.some((a) => a.id === v.id))

  // Run simulation with all active variables applied
  const analysis = useMemo(() => {
    return data.pricePoints.map((price) => {
      const volume = demandAtPrice(data.currentPrice, data.currentVolume, data.elasticity, price)
      const revenue = price * volume
      const cost = data.costPerUnit * volume
      const profit = revenue - cost
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0

      let row: AnalysisRow = { price, volume, revenue, cost, profit, margin }

      // Apply each active variable's effect in order
      for (const activeVar of activeVars) {
        const varDef = AVAILABLE_VARIABLES.find((v) => v.id === activeVar.id)
        if (varDef) {
          row = varDef.effect(row, activeVar.values)
        }
      }

      return row
    })
  }, [data, activeVars])

  const optimal = analysis.reduce((best, a) => a.profit > best.profit ? a : best, analysis[0])
  const currentRow = analysis.find((a) => a.price === data.currentPrice) || analysis[0]
  const profitDelta = optimal.profit - currentRow.profit
  const maxRevenue = Math.max(...analysis.map((a) => a.revenue))
  const maxProfit = Math.max(...analysis.map((a) => Math.max(0, a.profit)))

  const fields: { label: string; key: keyof PricingData; prefix?: string; tip: string }[] = [
    { label: 'Price', key: 'currentPrice', prefix: '$', tip: 'Your current selling price per unit' },
    { label: 'Volume', key: 'currentVolume', tip: 'Number of units sold per month at current price' },
    { label: 'Elasticity', key: 'elasticity', tip: 'How sensitive demand is to price changes. 1.0 = proportional. 1.5 = 10% price increase causes 15% volume drop' },
    { label: 'COGS', key: 'costPerUnit', prefix: '$', tip: 'Direct cost to produce/deliver one unit (materials, labor, hosting)' },
  ]

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        {/* Base inputs */}
        <div className="flex items-center gap-5 mb-4">
          {fields.map((f) => (
            <div key={f.key} className="flex items-center gap-1.5" title={f.tip}>
              <span className="text-[10px] uppercase tracking-widest cursor-help" style={{ color: 'var(--text-muted)' }}>{f.label}</span>
              <div className="relative">
                {f.prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>{f.prefix}</span>}
                <input
                  type="number"
                  value={data[f.key] as number}
                  onChange={(e) => onChange({ ...data, [f.key]: parseFloat(e.target.value) || 0 })}
                  className="sim-input w-24 text-right"
                  style={{ paddingLeft: f.prefix ? '20px' : '12px', fontSize: '12px' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => { setShowPresets(!showPresets); setShowSaveForm(false) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'var(--bg-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Presets
          </button>
          <button
            onClick={() => { setShowSaveForm(!showSaveForm); setShowPresets(false) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'var(--bg-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            <Save className="w-3.5 h-3.5" />
            Save Model
          </button>
          <div className="w-px h-5" style={{ background: 'var(--border)' }} />
          <div className="relative">
            <button
              onClick={() => setShowVarPicker(!showVarPicker)}
              disabled={unusedVars.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
              style={{ background: 'var(--bg-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Variable
            </button>

            {showVarPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowVarPicker(false)} />
                <div
                  className="absolute right-0 top-9 w-72 rounded-xl shadow-xl z-20 py-1 max-h-80 overflow-y-auto"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  {unusedVars.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => addVariable(v)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-alt)]"
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${v.color}12` }}>
                        <v.icon className="w-3.5 h-3.5" style={{ color: v.color }} />
                      </div>
                      <div>
                        <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>{v.name}</div>
                        <div className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{v.tooltip || v.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Save form */}
        {showSaveForm && (
          <div className="sim-card mb-4">
            <div className="text-[10px] uppercase tracking-widest font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
              Save Current Model as Preset
            </div>
            <div className="flex items-center gap-2">
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Preset name (e.g., SaaS Q4 Model)"
                className="sim-input flex-1"
                style={{ fontSize: '12px' }}
                autoFocus
              />
              <input
                value={saveDesc}
                onChange={(e) => setSaveDesc(e.target.value)}
                placeholder="Short description (optional)"
                className="sim-input flex-1"
                style={{ fontSize: '12px' }}
              />
              <button
                onClick={handleSavePreset}
                disabled={!saveName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveForm(false)}
                className="px-3 py-2 rounded-lg text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Preset library */}
        {showPresets && (
          <div className="sim-card mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-muted)' }}>
                Preset Library
              </div>
              <button onClick={() => setShowPresets(false)} className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Close
              </button>
            </div>
            <div className="space-y-1.5">
              {presets.map((preset) => {
                const isEditing = editingPresetId === preset.id
                const varCount = preset.variables.length

                return (
                  <div
                    key={preset.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                        {preset.name}
                      </div>
                      {preset.description && (
                        <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                          {preset.description}
                        </div>
                      )}
                      <div className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        ${preset.baseConfig.currentPrice} / {preset.baseConfig.currentVolume} units / {varCount} variable{varCount !== 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleUpdatePreset(preset.id)}
                            className="px-2.5 py-1 rounded text-[10px] font-medium"
                            style={{ background: 'var(--accent)', color: '#fff' }}
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingPresetId(null)}
                            className="px-2 py-1 rounded text-[10px]"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleLoadPreset(preset)}
                            className="px-2.5 py-1 rounded text-[10px] font-medium transition-colors"
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                          >
                            Load
                          </button>
                          <button
                            onClick={() => {
                              handleLoadPreset(preset)
                              setEditingPresetId(preset.id)
                              setShowPresets(false)
                            }}
                            className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--text-muted)' }}
                            title="Edit this preset"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          {!preset.id.startsWith('starter-') && (
                            <button
                              onClick={() => handleDeletePreset(preset.id)}
                              className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                              style={{ color: 'var(--text-muted)' }}
                              title="Delete preset"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Editing indicator */}
        {editingPresetId && (
          <div
            className="flex items-center justify-between px-3 py-2 rounded-lg mb-4"
            style={{ background: 'var(--accent-soft)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <div className="flex items-center gap-2">
              <Pencil className="w-3 h-3" style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                Editing preset -- make changes then hit Save Changes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleUpdatePreset(editingPresetId)}
                className="px-3 py-1 rounded text-[10px] font-medium"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingPresetId(null)}
                className="text-[10px]"
                style={{ color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Active variables -- structured grid */}
        {activeVars.length > 0 && (
          <div className="sim-card mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-muted)' }}>
                Variables ({activeVars.length})
              </span>
              <button onClick={() => setActiveVars([])} className="text-[10px] hover:underline" style={{ color: 'var(--text-muted)' }}>
                Clear All
              </button>
            </div>
            <div className="space-y-1.5">
              {activeVars.map((av) => {
                const varDef = AVAILABLE_VARIABLES.find((v) => v.id === av.id)
                if (!varDef) return null

                return (
                  <div
                    key={av.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                  >
                    <varDef.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: varDef.color }} />
                    <div className="flex items-center gap-1 w-44 flex-shrink-0 group/tip relative">
                      <span className="text-[11px] font-medium" style={{ color: 'var(--text)' }}>
                        {varDef.name}
                      </span>
                      <Info className="w-3 h-3 opacity-0 group-hover/tip:opacity-40 transition-opacity cursor-help" style={{ color: 'var(--text-muted)' }} />
                      <div
                        className="absolute left-0 top-full mt-1 w-64 px-3 py-2 rounded-lg text-[10px] leading-relaxed hidden group-hover/tip:block z-30 pointer-events-none"
                        style={{ background: '#1A1A1A', color: '#ddd', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
                      >
                        {varDef.tooltip}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                      {varDef.fields.map((field) => (
                        <div key={field.key} className="flex items-center gap-1" title={field.tip}>
                          <span className="text-[9px] uppercase tracking-wider cursor-help" style={{ color: 'var(--text-muted)' }}>
                            {field.label}
                          </span>
                          <input
                            type="number"
                            value={av.values[field.key]}
                            onChange={(e) => updateVarValue(av.id, field.key, parseFloat(e.target.value) || 0)}
                            step={field.step}
                            className="w-16 px-1.5 py-0.5 text-[11px] font-mono text-right rounded outline-none"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                          />
                          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{field.suffix}</span>
                        </div>
                      ))}
                      <button onClick={() => removeVariable(av.id)} className="ml-1 hover:opacity-60">
                        <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Hero numbers */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="sim-card">
            <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Current</div>
            <div className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'SF Mono', monospace" }}>{fmt(currentRow.revenue)}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{currentRow.volume.toLocaleString()} units @ ${data.currentPrice}</div>
            <div className="text-[10px] mt-1" style={{ color: currentRow.profit >= 0 ? 'var(--accent)' : 'var(--red)' }}>
              {fmt(currentRow.profit)} profit ({currentRow.margin.toFixed(0)}% margin)
            </div>
          </div>

          <div className="sim-card" style={{ borderColor: 'var(--accent)' }}>
            <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>Optimal Price</div>
            <div className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'SF Mono', monospace", color: 'var(--accent)' }}>${optimal.price}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{optimal.volume.toLocaleString()} units</div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--accent)' }}>
              {fmt(optimal.profit)} profit ({optimal.margin.toFixed(0)}% margin)
            </div>
          </div>

          <div className="sim-card">
            <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: profitDelta > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>Opportunity</div>
            <div className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'SF Mono', monospace", color: profitDelta > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
              {profitDelta > 0 ? '+' : ''}{fmt(profitDelta)}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {profitDelta > 0 ? 'additional profit available' : 'current pricing is optimal'}
            </div>
            {activeVars.length > 0 && (
              <div className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
                with {activeVars.length} variable{activeVars.length !== 1 ? 's' : ''} applied
              </div>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="sim-card mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>
            Revenue &amp; Profit by Price Point
          </div>
          <div className="flex items-end gap-[3px] h-52">
            {analysis.map((a) => {
              const revH = maxRevenue > 0 ? (a.revenue / maxRevenue) * 100 : 0
              const profH = maxProfit > 0 ? (Math.max(0, a.profit) / maxProfit) * 48 : 0
              const isCurrent = a.price === data.currentPrice
              const isOptimal = a.price === optimal.price

              return (
                <div key={a.price} className="flex-1 flex flex-col items-center group relative" style={{ height: '100%' }}>
                  <div className="w-full flex items-end justify-center gap-[1px]" style={{ height: '100%' }}>
                    <div className="w-[45%] rounded-t transition-all duration-300" style={{ height: `${revH}%`, background: isCurrent ? 'var(--blue)' : isOptimal ? 'var(--accent)' : '#E8E8E4', minHeight: revH > 0 ? 2 : 0 }} />
                    <div className="w-[45%] rounded-t transition-all duration-300" style={{ height: `${profH * 2}%`, background: isOptimal ? 'rgba(16,185,129,0.35)' : isCurrent ? 'rgba(59,130,246,0.35)' : '#F0F0EC', minHeight: profH > 0 ? 2 : 0 }} />
                  </div>
                  <span className="text-[9px] mt-2" style={{ fontFamily: "'SF Mono', monospace", color: isCurrent ? 'var(--blue)' : isOptimal ? 'var(--accent)' : 'var(--text-muted)', fontWeight: isCurrent || isOptimal ? 700 : 400 }}>
                    ${a.price}
                  </span>
                  <div className="absolute bottom-full mb-3 px-3 py-2 rounded-lg text-[10px] hidden group-hover:block whitespace-nowrap z-10 pointer-events-none" style={{ background: '#1A1A1A', color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                    <span style={{ fontFamily: "'SF Mono', monospace" }}>
                      <span style={{ color: '#999' }}>Rev</span> {fmt(a.revenue)}
                      <span style={{ color: '#555', margin: '0 6px' }}>|</span>
                      <span style={{ color: '#999' }}>Profit</span> <span style={{ color: a.profit > 0 ? '#34D399' : '#F87171' }}>{fmt(a.profit)}</span>
                      <span style={{ color: '#555', margin: '0 6px' }}>|</span>
                      <span style={{ color: '#999' }}>Vol</span> {a.volume.toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Table */}
        <div className="sim-card">
          <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Price Point Analysis</div>
          <table className="w-full text-xs" style={{ fontFamily: "'SF Mono', monospace" }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="text-left py-2.5 text-[10px] uppercase tracking-widest font-medium">Price</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-widest font-medium">Volume</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-widest font-medium">Revenue</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-widest font-medium">Total Cost</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-widest font-medium">Profit</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-widest font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {analysis.map((a) => {
                const isCurrent = a.price === data.currentPrice
                const isOptimal = a.price === optimal.price
                return (
                  <tr key={a.price} style={{ borderTop: '1px solid var(--border)', background: isOptimal ? 'var(--accent-soft)' : isCurrent ? 'var(--blue-soft)' : 'transparent' }}>
                    <td className="py-2.5" style={{ color: isOptimal ? 'var(--accent)' : isCurrent ? 'var(--blue)' : 'var(--text)' }}>
                      ${a.price}{isOptimal && <span className="ml-2 text-[9px] opacity-60">BEST</span>}{isCurrent && !isOptimal && <span className="ml-2 text-[9px] opacity-60">NOW</span>}
                    </td>
                    <td className="py-2.5 text-right" style={{ color: 'var(--text-secondary)' }}>{a.volume.toLocaleString()}</td>
                    <td className="py-2.5 text-right" style={{ color: 'var(--text)' }}>{fmt(a.revenue)}</td>
                    <td className="py-2.5 text-right" style={{ color: 'var(--red)', opacity: 0.7 }}>{fmt(a.cost)}</td>
                    <td className="py-2.5 text-right" style={{ color: a.profit > 0 ? 'var(--accent)' : 'var(--red)' }}>{fmt(a.profit)}</td>
                    <td className="py-2.5 text-right" style={{ color: 'var(--text-secondary)' }}>{a.margin.toFixed(0)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
