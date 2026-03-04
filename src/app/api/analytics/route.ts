import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/server'
import { adminClient } from '@/lib/supabase/client'
import { z } from 'zod'

const eventSchema = z.object({
  event_type: z.string().min(1).max(100),
  pipeline_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: Request) {
  const user = await getUser()
  const body = await request.json()

  const isBatch = Array.isArray(body.events)
  const events = isBatch ? body.events : [body]

  const validated = events.map((e: unknown) => eventSchema.safeParse(e))
  const valid = validated.filter((r: { success: boolean }) => r.success).map((r: { data: z.infer<typeof eventSchema> }) => r.data)

  if (valid.length === 0) {
    return NextResponse.json({ error: 'No valid events' }, { status: 400 })
  }

  const rows = valid.map((event: z.infer<typeof eventSchema>) => ({
    user_id: user?.id ?? null,
    event_type: event.event_type,
    pipeline_id: event.pipeline_id ?? null,
    metadata: event.metadata ?? {},
  }))

  const { error } = await adminClient.from('analytics_events').insert(rows)

  if (error) {
    return NextResponse.json({ error: 'Failed to record events' }, { status: 500 })
  }

  return NextResponse.json({ recorded: rows.length })
}
