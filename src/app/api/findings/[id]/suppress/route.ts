import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getIP } from '@/lib/ratelimit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SuppressSchema = z.object({
  reason: z.string().max(500).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const parsed = SuppressSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 422 })
  }

  const service = createServiceClient()

  // Atomic: ownership enforced inside the UPDATE itself - no separate SELECT needed
  const { data: updated, error } = await service
    .from('findings')
    .update({
      suppressed: true,
      suppressed_reason: parsed.data.reason ?? null,
      suppressed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error || !updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await service.from('audit_logs').insert({
    user_id: user.id,
    action: 'finding.suppressed',
    resource_type: 'finding',
    resource_id: id,
    metadata: { reason: parsed.data.reason ?? null },
    ip_address: getIP(req),
  })

  return NextResponse.json({ finding: updated })
}

export async function DELETE(
  _req: NextRequest,  // kept for audit logging
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  // Atomic: ownership enforced inside the UPDATE itself
  const { data: updated, error } = await service
    .from('findings')
    .update({
      suppressed: false,
      suppressed_reason: null,
      suppressed_at: null,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error || !updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await service.from('audit_logs').insert({
    user_id: user.id,
    action: 'finding.unsuppressed',
    resource_type: 'finding',
    resource_id: id,
    metadata: {},
    ip_address: getIP(_req),
  })

  return NextResponse.json({ finding: updated })
}
