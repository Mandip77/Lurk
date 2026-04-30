import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const SuppressSchema = z.object({
  reason: z.string().max(500).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const service = createServiceClient()

  // Verify ownership
  const { data: finding } = await service
    .from('findings')
    .select('id, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!finding) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: updated, error } = await service
    .from('findings')
    .update({
      suppressed: true,
      suppressed_reason: parsed.data.reason ?? null,
      suppressed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to suppress finding' }, { status: 500 })

  return NextResponse.json({ finding: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  // Verify ownership
  const { data: finding } = await service
    .from('findings')
    .select('id, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!finding) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: updated, error } = await service
    .from('findings')
    .update({
      suppressed: false,
      suppressed_reason: null,
      suppressed_at: null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to unsuppress finding' }, { status: 500 })

  return NextResponse.json({ finding: updated })
}
