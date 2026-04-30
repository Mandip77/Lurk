import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const CreateKeySchema = z.object({
  name: z.string().min(1).max(100),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: keys, error } = await service
    .from('api_keys')
    .select('id, name, key_prefix, last_used_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 })

  return NextResponse.json({ keys })
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
    return NextResponse.json({ error: 'API access requires Pro or Agency tier' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateKeySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { name } = parsed.data

  // Generate key
  const rawKey = 'lurk_' + randomBytes(32).toString('hex')
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, 12)

  const { data: key, error } = await service
    .from('api_keys')
    .insert({ user_id: user.id, name, key_hash: keyHash, key_prefix: keyPrefix })
    .select('id, name, key_prefix, last_used_at, created_at')
    .single()

  if (error || !key) {
    return NextResponse.json({ error: 'Failed to create key' }, { status: 500 })
  }

  return NextResponse.json({ key, full_key: rawKey }, { status: 201 })
}
