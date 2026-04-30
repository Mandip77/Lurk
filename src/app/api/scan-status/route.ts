import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = req.nextUrl.searchParams.get('id')
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
  }

  // Fetch scan and verify it belongs to the authenticated user (IDOR protection)
  const { data: scan, error } = await supabase
    .from('scans')
    .select('id, status, severity_score, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
  }

  // Count findings for this scan
  const { count: findingsCount } = await supabase
    .from('findings')
    .select('id', { count: 'exact', head: true })
    .eq('scan_id', id)
    .eq('user_id', user.id)

  return NextResponse.json({
    status: scan.status,
    severity_score: scan.severity_score,
    findings_count: findingsCount ?? 0,
  })
}
