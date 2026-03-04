import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/server'
import { adminClient } from '@/lib/supabase/client'
import { z } from 'zod'

const syncPushSchema = z.object({
  pipelines: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.string().default('custom'),
    status: z.enum(['active', 'archived', 'template']).default('active'),
    config: z.record(z.string(), z.unknown()).optional(),
  })).optional(),
  simulation_results: z.array(z.object({
    pipeline_id: z.string(),
    sim_type: z.enum(['monte_carlo', 'sensitivity', 'forecast']),
    inputs: z.record(z.string(), z.unknown()),
    results: z.record(z.string(), z.unknown()),
  })).optional(),
})

// GET: Pull all user pipelines and simulation results
export async function GET() {
  const user = await requireUser()

  const [pipelinesRes, simsRes] = await Promise.all([
    adminClient.from('pipelines').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    adminClient.from('simulation_results').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
  ])

  return NextResponse.json({
    pipelines: pipelinesRes.data ?? [],
    simulation_results: simsRes.data ?? [],
  })
}

// POST: Push local state to cloud
export async function POST(request: Request) {
  const user = await requireUser()
  const body = await request.json()
  const parsed = syncPushSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid sync data', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const results: Record<string, number> = {}

  if (parsed.data.pipelines?.length) {
    const rows = parsed.data.pipelines.map((p) => ({
      user_id: user.id,
      name: p.name,
      description: p.description ?? null,
      type: p.type,
      status: p.status,
      config: p.config ?? {},
    }))

    const { error } = await adminClient.from('pipelines').insert(rows)
    if (error) {
      return NextResponse.json({ error: 'Failed to sync pipelines' }, { status: 500 })
    }
    results.pipelines = rows.length
  }

  if (parsed.data.simulation_results?.length) {
    const rows = parsed.data.simulation_results.map((s) => ({
      user_id: user.id,
      pipeline_id: s.pipeline_id,
      sim_type: s.sim_type,
      inputs: s.inputs,
      results: s.results,
    }))

    const { error } = await adminClient.from('simulation_results').insert(rows)
    if (error) {
      return NextResponse.json({ error: 'Failed to sync simulations' }, { status: 500 })
    }
    results.simulation_results = rows.length
  }

  return NextResponse.json({ synced: results })
}
