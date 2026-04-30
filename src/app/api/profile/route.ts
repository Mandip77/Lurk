import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('tier, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ tier: profile?.tier ?? 'free', full_name: profile?.full_name, avatar_url: profile?.avatar_url })
}
