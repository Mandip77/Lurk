import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: scan } = await supabase
    .from('scans')
    .select('*, repositories(full_name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!scan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ scan })
}
