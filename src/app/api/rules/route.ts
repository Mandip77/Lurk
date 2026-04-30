import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const

const CreateRuleSchema = z.object({
  name: z.string().min(1).max(100),
  pattern: z.string().min(1).max(500),
  severity: z.enum(VALID_SEVERITIES),
  description: z.string().max(1000).optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: rules, error } = await service
    .from('custom_rules')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })

  return NextResponse.json({ rules })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check tier
  const service = createServiceClient()
  const { data: profile } = await service
    .from('users')
    .select('tier')
    .eq('id', user.id)
    .single()

  if (!profile || profile.tier === 'free') {
    return NextResponse.json({ error: 'Custom rules require Pro or Agency tier' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateRuleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { data: rule, error } = await service
    .from('custom_rules')
    .insert({ ...parsed.data, user_id: user.id, is_active: true })
    .select()
    .single()

  if (error || !rule) {
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 })
  }

  return NextResponse.json({ rule }, { status: 201 })
}
