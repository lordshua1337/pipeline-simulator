// Flow Builder -- Pre-built Templates

import type { FlowTemplate, FlowNode, DEFAULT_METRICS } from './flow-types'

const m = (overrides: Partial<typeof DEFAULT_METRICS>) => ({
  trafficVolume: 0,
  conversionRate: 0.5,
  costPerClick: 0,
  costPerLead: 0,
  revenuePerSale: 0,
  timeInStageHours: 0,
  dropOffRate: 0,
  ...overrides,
})

function node(
  type: FlowNode['type'],
  label: string,
  x: number,
  y: number,
  metrics: Partial<typeof DEFAULT_METRICS> = {}
): Omit<FlowNode, 'id'> {
  return { type, label, position: { x, y }, metrics: m(metrics), config: {} }
}

export const flowTemplates: readonly FlowTemplate[] = [
  {
    id: 'simple-funnel',
    name: 'Simple Funnel',
    description: 'Facebook Ads to landing page to checkout. The classic direct-response funnel.',
    category: 'Marketing',
    icon: 'Zap',
    nodes: [
      node('traffic_source', 'Facebook Ads', 80, 200, { trafficVolume: 5000, costPerClick: 1.25 }),
      node('landing_page', 'Landing Page', 380, 200, { conversionRate: 0.35 }),
      node('checkout', 'Checkout', 680, 200, { conversionRate: 0.60, revenuePerSale: 97 }),
      node('thank_you', 'Thank You', 980, 200, { conversionRate: 1.0 }),
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2 },
      { sourceIndex: 2, targetIndex: 3 },
    ],
  },
  {
    id: 'webinar-funnel',
    name: 'Webinar Funnel',
    description: 'Drive traffic to a registration page, nurture with emails, convert at the webinar.',
    category: 'Marketing',
    icon: 'Video',
    nodes: [
      node('traffic_source', 'Paid Traffic', 80, 200, { trafficVolume: 8000, costPerClick: 2.00 }),
      node('landing_page', 'Registration Page', 380, 200, { conversionRate: 0.40 }),
      node('email_sequence', 'Reminder Emails', 680, 120, { conversionRate: 0.65 }),
      node('sales_page', 'Webinar / Pitch', 980, 200, { conversionRate: 0.12 }),
      node('checkout', 'Checkout', 1280, 200, { conversionRate: 0.70, revenuePerSale: 497 }),
      node('upsell', 'Upsell Offer', 1580, 120, { conversionRate: 0.25, revenuePerSale: 197 }),
      node('thank_you', 'Thank You', 1580, 320, { conversionRate: 1.0 }),
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2 },
      { sourceIndex: 2, targetIndex: 3 },
      { sourceIndex: 3, targetIndex: 4 },
      { sourceIndex: 4, targetIndex: 5 },
      { sourceIndex: 4, targetIndex: 6 },
    ],
  },
  {
    id: 'free-trial',
    name: 'Free Trial to Paid',
    description: 'SaaS trial funnel: sign up, onboard with emails, convert to paid plan.',
    category: 'SaaS',
    icon: 'CreditCard',
    nodes: [
      node('traffic_source', 'Organic + Ads', 80, 200, { trafficVolume: 10000, costPerClick: 0.80 }),
      node('landing_page', 'Product Page', 380, 200, { conversionRate: 0.20 }),
      node('opt_in_form', 'Free Trial Signup', 680, 200, { conversionRate: 0.55 }),
      node('email_sequence', 'Onboarding Drip', 980, 200, { conversionRate: 0.40 }),
      node('sales_page', 'Upgrade Page', 1280, 200, { conversionRate: 0.15 }),
      node('checkout', 'Payment', 1580, 200, { conversionRate: 0.75, revenuePerSale: 49 }),
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2 },
      { sourceIndex: 2, targetIndex: 3 },
      { sourceIndex: 3, targetIndex: 4 },
      { sourceIndex: 4, targetIndex: 5 },
    ],
  },
  {
    id: 'ecommerce-launch',
    name: 'E-commerce Launch',
    description: 'Multi-channel traffic into a product page with cart, checkout, and upsell.',
    category: 'E-commerce',
    icon: 'ShoppingCart',
    nodes: [
      node('traffic_source', 'Google Ads', 80, 100, { trafficVolume: 6000, costPerClick: 1.80 }),
      node('traffic_source', 'Instagram Ads', 80, 280, { trafficVolume: 4000, costPerClick: 0.90 }),
      node('traffic_source', 'Email List', 80, 460, { trafficVolume: 3000, costPerClick: 0 }),
      node('landing_page', 'Product Page', 430, 280, { conversionRate: 0.25 }),
      node('checkout', 'Cart + Checkout', 730, 280, { conversionRate: 0.55, revenuePerSale: 65 }),
      node('upsell', 'Order Bump', 1030, 180, { conversionRate: 0.35, revenuePerSale: 29 }),
      node('thank_you', 'Confirmation', 1030, 380, { conversionRate: 1.0 }),
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 3 },
      { sourceIndex: 1, targetIndex: 3 },
      { sourceIndex: 2, targetIndex: 3 },
      { sourceIndex: 3, targetIndex: 4 },
      { sourceIndex: 4, targetIndex: 5 },
      { sourceIndex: 4, targetIndex: 6 },
    ],
  },
  {
    id: 'content-marketing',
    name: 'Content Marketing',
    description: 'Blog traffic to lead magnet to email nurture to sale. The long game.',
    category: 'Marketing',
    icon: 'BookOpen',
    nodes: [
      node('traffic_source', 'SEO / Blog', 80, 200, { trafficVolume: 15000, costPerClick: 0 }),
      node('landing_page', 'Blog Post', 380, 200, { conversionRate: 0.45 }),
      node('opt_in_form', 'Lead Magnet', 680, 200, { conversionRate: 0.18 }),
      node('email_sequence', 'Nurture Sequence', 980, 200, { conversionRate: 0.25 }),
      node('sales_page', 'Sales Page', 1280, 200, { conversionRate: 0.06 }),
      node('checkout', 'Checkout', 1580, 200, { conversionRate: 0.65, revenuePerSale: 197 }),
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2 },
      { sourceIndex: 2, targetIndex: 3 },
      { sourceIndex: 3, targetIndex: 4 },
      { sourceIndex: 4, targetIndex: 5 },
    ],
  },
  {
    id: 'custom',
    name: 'Custom Flow',
    description: 'Start from a blank canvas. Build your pipeline from scratch.',
    category: 'Custom',
    icon: 'Puzzle',
    nodes: [],
    edges: [],
  },
]
