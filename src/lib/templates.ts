// Pipeline Simulator -- Default Templates with Sample Data & Benchmarks

import type { PipelineTemplate } from './types'

export const PIPELINE_TEMPLATES: readonly PipelineTemplate[] = [
  {
    id: 'tpl-sales',
    name: 'Sales Funnel',
    description: 'Track prospects from initial contact through closed deals.',
    type: 'sales_funnel',
    icon: 'DollarSign',
    color: '#3b82f6',
    config: {
      stages: [
        { name: 'Prospect', description: 'Initial leads', color: '#93c5fd' },
        { name: 'Discovery', description: 'Qualification calls', color: '#60a5fa' },
        { name: 'Proposal', description: 'Sent proposals', color: '#3b82f6' },
        { name: 'Negotiation', description: 'Active negotiations', color: '#2563eb' },
        { name: 'Closed Won', description: 'Completed deals', color: '#1d4ed8' },
      ],
      sampleItems: [
        { title: 'Acme Corp', value: 50000, stageIndex: 0, description: 'Enterprise SaaS deal' },
        { title: 'TechCo Inc', value: 30000, stageIndex: 0, description: 'Mid-market opportunity' },
        { title: 'Global Dynamics', value: 75000, stageIndex: 1, description: 'Large enterprise' },
        { title: 'StartupXYZ', value: 12000, stageIndex: 1, description: 'Startup plan' },
        { title: 'MegaCorp', value: 120000, stageIndex: 2, description: 'Multi-year contract' },
        { title: 'Pinnacle Labs', value: 45000, stageIndex: 2, description: 'R&D division' },
        { title: 'CloudNine', value: 28000, stageIndex: 3, description: 'Cloud migration deal' },
        { title: 'DataFlow', value: 65000, stageIndex: 4, description: 'Closed last week' },
      ],
    },
    benchmarks: {
      'Prospect->Discovery': 0.40,
      'Discovery->Proposal': 0.50,
      'Proposal->Negotiation': 0.35,
      'Negotiation->Closed Won': 0.25,
    },
  },
  {
    id: 'tpl-content',
    name: 'Content Production',
    description: 'Manage content from ideation through publishing.',
    type: 'content_production',
    icon: 'FileText',
    color: '#8b5cf6',
    config: {
      stages: [
        { name: 'Ideation', description: 'Content ideas', color: '#c4b5fd' },
        { name: 'Writing', description: 'Drafts in progress', color: '#a78bfa' },
        { name: 'Review', description: 'Editorial review', color: '#8b5cf6' },
        { name: 'Design', description: 'Visual assets', color: '#7c3aed' },
        { name: 'Published', description: 'Live content', color: '#6d28d9' },
      ],
      sampleItems: [
        { title: 'Q2 Strategy Post', value: 0, stageIndex: 0, description: 'Quarterly strategy overview' },
        { title: 'Case Study: Acme', value: 0, stageIndex: 1, description: 'Customer success story' },
        { title: 'Product Update v3', value: 0, stageIndex: 1, description: 'Release announcement' },
        { title: 'SEO Guide', value: 0, stageIndex: 2, description: 'Comprehensive SEO tutorial' },
        { title: 'Video Script: Onboarding', value: 0, stageIndex: 3, description: 'New user onboarding video' },
        { title: 'Blog: AI Trends', value: 0, stageIndex: 4, description: 'Published last month' },
      ],
    },
    benchmarks: {
      'Ideation->Writing': 0.60,
      'Writing->Review': 0.80,
      'Review->Design': 0.70,
      'Design->Published': 0.90,
    },
  },
  {
    id: 'tpl-hiring',
    name: 'Hiring Pipeline',
    description: 'Track candidates from application through onboarding.',
    type: 'hiring',
    icon: 'Users',
    color: '#10b981',
    config: {
      stages: [
        { name: 'Applied', description: 'New applications', color: '#6ee7b7' },
        { name: 'Phone Screen', description: 'Initial screening', color: '#34d399' },
        { name: 'Interview', description: 'Technical interviews', color: '#10b981' },
        { name: 'Offer', description: 'Offers extended', color: '#059669' },
        { name: 'Hired', description: 'Accepted offers', color: '#047857' },
      ],
      sampleItems: [
        { title: 'Sarah Chen', value: 0, stageIndex: 0, description: 'Senior Engineer' },
        { title: 'Marcus Johnson', value: 0, stageIndex: 0, description: 'Product Manager' },
        { title: 'Aisha Patel', value: 0, stageIndex: 1, description: 'UX Designer' },
        { title: 'Tom Williams', value: 0, stageIndex: 2, description: 'Backend Engineer' },
        { title: 'Lisa Wang', value: 0, stageIndex: 2, description: 'Data Scientist' },
        { title: 'James Brown', value: 0, stageIndex: 3, description: 'DevOps Engineer' },
        { title: 'Emma Davis', value: 0, stageIndex: 4, description: 'Started last Monday' },
      ],
    },
    benchmarks: {
      'Applied->Phone Screen': 0.25,
      'Phone Screen->Interview': 0.50,
      'Interview->Offer': 0.30,
      'Offer->Hired': 0.80,
    },
  },
  {
    id: 'tpl-launch',
    name: 'Product Launch',
    description: 'Coordinate all tasks for a successful product launch.',
    type: 'product_launch',
    icon: 'Rocket',
    color: '#f59e0b',
    config: {
      stages: [
        { name: 'Planning', description: 'Strategy and scope', color: '#fcd34d' },
        { name: 'Development', description: 'Build phase', color: '#fbbf24' },
        { name: 'Testing', description: 'QA and UAT', color: '#f59e0b' },
        { name: 'Pre-Launch', description: 'Marketing prep', color: '#d97706' },
        { name: 'Launched', description: 'Live in production', color: '#b45309' },
      ],
      sampleItems: [
        { title: 'Feature: Dark Mode', value: 0, stageIndex: 0, description: 'User-requested feature' },
        { title: 'API v3 Migration', value: 0, stageIndex: 1, description: 'Breaking changes' },
        { title: 'Mobile Responsive', value: 0, stageIndex: 1, description: 'Mobile-first redesign' },
        { title: 'Payment Integration', value: 0, stageIndex: 2, description: 'Stripe integration' },
        { title: 'Landing Page v2', value: 0, stageIndex: 3, description: 'New marketing site' },
        { title: 'Email Campaign', value: 0, stageIndex: 3, description: 'Launch announcement' },
      ],
    },
    benchmarks: {
      'Planning->Development': 0.85,
      'Development->Testing': 0.75,
      'Testing->Pre-Launch': 0.60,
      'Pre-Launch->Launched': 0.90,
    },
  },
  {
    id: 'tpl-onboarding',
    name: 'Client Onboarding',
    description: 'Guide new clients from signup through activation.',
    type: 'client_onboarding',
    icon: 'UserCheck',
    color: '#06b6d4',
    config: {
      stages: [
        { name: 'Welcome', description: 'Initial contact', color: '#67e8f9' },
        { name: 'Setup', description: 'Account configuration', color: '#22d3ee' },
        { name: 'Training', description: 'Product training', color: '#06b6d4' },
        { name: 'Integration', description: 'System integration', color: '#0891b2' },
        { name: 'Active', description: 'Fully onboarded', color: '#0e7490' },
      ],
      sampleItems: [
        { title: 'Acme Corp', value: 15000, stageIndex: 0, description: 'Enterprise client' },
        { title: 'SmallBiz LLC', value: 3000, stageIndex: 1, description: 'SMB client' },
        { title: 'FinTech Co', value: 25000, stageIndex: 2, description: 'Financial services' },
        { title: 'HealthPlus', value: 18000, stageIndex: 2, description: 'Healthcare provider' },
        { title: 'EduLearn', value: 8000, stageIndex: 3, description: 'Education platform' },
        { title: 'RetailMax', value: 12000, stageIndex: 4, description: 'Fully activated' },
      ],
    },
    benchmarks: {
      'Welcome->Setup': 0.90,
      'Setup->Training': 0.85,
      'Training->Integration': 0.75,
      'Integration->Active': 0.80,
    },
  },
  {
    id: 'tpl-support',
    name: 'Support Tickets',
    description: 'Track support requests from submission through resolution.',
    type: 'support_tickets',
    icon: 'Headphones',
    color: '#ef4444',
    config: {
      stages: [
        { name: 'New', description: 'Incoming tickets', color: '#fca5a5' },
        { name: 'Triaged', description: 'Assessed priority', color: '#f87171' },
        { name: 'In Progress', description: 'Being worked on', color: '#ef4444' },
        { name: 'Waiting', description: 'Waiting on customer', color: '#dc2626' },
        { name: 'Resolved', description: 'Issue fixed', color: '#b91c1c' },
      ],
      sampleItems: [
        { title: 'Login broken on Safari', value: 0, stageIndex: 0, description: 'P1 - Critical' },
        { title: 'Export fails for large datasets', value: 0, stageIndex: 0, description: 'P2 - High' },
        { title: 'Dashboard loading slowly', value: 0, stageIndex: 1, description: 'P2 - High' },
        { title: 'API rate limit hit', value: 0, stageIndex: 2, description: 'P3 - Medium' },
        { title: 'Feature request: Dark mode', value: 0, stageIndex: 2, description: 'P4 - Low' },
        { title: 'Billing discrepancy', value: 0, stageIndex: 3, description: 'Waiting on finance' },
        { title: 'Password reset issue', value: 0, stageIndex: 4, description: 'Resolved via email' },
      ],
    },
    benchmarks: {
      'New->Triaged': 0.95,
      'Triaged->In Progress': 0.85,
      'In Progress->Waiting': 0.40,
      'Waiting->Resolved': 0.70,
    },
  },
] as const

export function getTemplateById(id: string): PipelineTemplate | undefined {
  return PIPELINE_TEMPLATES.find((t) => t.id === id)
}

export function getTemplateByType(type: string): PipelineTemplate | undefined {
  return PIPELINE_TEMPLATES.find((t) => t.type === type)
}
