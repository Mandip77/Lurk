import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json() as { ids: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 })
  }

  // Validate all are UUIDs
  const uuidRe = /^[0-9a-f-]{36}$/
  if (!ids.every(id => uuidRe.test(id))) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  // Delete only scans owned by this user
  const { error } = await supabase
    .from('scans')
    .delete()
    .in('id', ids)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, deleted: ids.length })
}
