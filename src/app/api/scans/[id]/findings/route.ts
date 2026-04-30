import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ findings: [] })
  }

  const { data: findings } = await supabase
    .from('findings')
    .select('*')
    .eq('scan_id', id)
    .eq('user_id', user.id)
    .order('severity', { ascending: false })

  return NextResponse.json({ findings: findings ?? [] })
}
